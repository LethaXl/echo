-- =====================================================================
-- Echo: US-26 to US-29 Subscription management
--
-- Run in Supabase Dashboard > SQL Editor > New query after the earlier
-- migrations. Safe to re-run.
--
-- A subscription row now lasts for as long as the member keeps Echo+. It
-- renews itself, can move from monthly to annual straight away, can move
-- from annual to monthly at the next renewal, and can be set to end when
-- the current period finishes (cancel, or downgrade to Echo Free).
--
--   subscriptions.scheduled_change     null = renews automatically;
--                                      'cancel' or 'downgrade' = ends at
--                                      current_period_end;
--                                      'switch_plan' = renews on
--                                      scheduled_plan_id instead
--   subscriptions.scheduled_plan_id    plan to renew on, for 'switch_plan'
--   subscriptions.scheduled_change_at  when that was requested
--   subscriptions.billing_anchor       start of the current plan's billing
--                                      cycle. Renewal dates are anchor +
--                                      n months/years, so month ends don't
--                                      drift (Jan 31, Feb 28, Mar 31).
--   subscription_events                append-only history for US-31,
--                                      written only by the functions below
--
-- Echo+ access: status = 'active' and either the period hasn't ended or
-- the subscription renews automatically (simulated renewals always
-- succeed). Renewals are applied by settle_subscription(), which runs
-- when the member next uses the app (sync_my_subscription) or in bulk from
-- a scheduled job (process_subscription_renewals); see supabase/README.md.
--
-- Errors raised for the app to handle:
--   42501  not signed in, or password not confirmed in the last 5 minutes
--   P0002  plan not found
--   23505  already subscribed / already on that plan
--   ES001  no active subscription
--   ES002  a change is already scheduled (or, when keeping the current
--          plan, nothing is scheduled)
--   ES003  the requested plan isn't an upgrade (or, when switching, isn't
--          annual to monthly)
-- =====================================================================


-- ---------------------------------------------------------------------
-- subscriptions: new columns
-- ---------------------------------------------------------------------

-- Until now a subscription simply lapsed at current_period_end. On the
-- first run, mark those as expired so they aren't renewed retroactively.
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'subscriptions'
      and column_name = 'billing_anchor'
  ) then
    update public.subscriptions
    set status = 'expired'
    where status = 'active' and current_period_end <= now();
  end if;
end;
$$;

alter table public.subscriptions
  add column if not exists billing_anchor timestamptz,
  add column if not exists scheduled_change text,
  add column if not exists scheduled_plan_id uuid references public.subscription_plans (id),
  add column if not exists scheduled_change_at timestamptz;

update public.subscriptions set billing_anchor = started_at where billing_anchor is null;

alter table public.subscriptions
  alter column billing_anchor set default now(),
  alter column billing_anchor set not null;

alter table public.subscriptions drop constraint if exists subscriptions_scheduled_change_check;
alter table public.subscriptions add constraint subscriptions_scheduled_change_check check (
  (scheduled_change is null and scheduled_plan_id is null and scheduled_change_at is null)
  or (
    scheduled_change in ('cancel', 'downgrade')
    and scheduled_plan_id is null
    and scheduled_change_at is not null
  )
  or (
    scheduled_change = 'switch_plan'
    and scheduled_plan_id is not null
    and scheduled_change_at is not null
  )
);


-- ---------------------------------------------------------------------
-- subscription_events (history; no client writes)
-- ---------------------------------------------------------------------

create table if not exists public.subscription_events (
  id uuid primary key default gen_random_uuid(),
  subscription_id uuid not null references public.subscriptions (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  event_type text not null,
  plan_id uuid not null references public.subscription_plans (id),
  previous_plan_id uuid references public.subscription_plans (id),
  -- Simulated charge for subscribed, resubscribed, upgraded and renewed; otherwise null.
  amount_cents integer check (amount_cents is null or amount_cents >= 0),
  -- current_period_end after the event; for 'ended', when access ended.
  period_end timestamptz not null,
  occurred_at timestamptz not null default now()
);

-- Named and re-added so re-running picks up new event types.
alter table public.subscription_events drop constraint if exists subscription_events_event_type_check;
alter table public.subscription_events add constraint subscription_events_event_type_check check (
  event_type in (
    'subscribed',
    'resubscribed',
    'upgraded',
    'renewed',
    'cancellation_scheduled',
    'downgrade_scheduled',
    'switch_scheduled',
    'switch_cancelled',
    'switched',
    'reactivated',
    'ended'
  )
);

create index if not exists subscription_events_user_idx
  on public.subscription_events (user_id, occurred_at desc);
create index if not exists subscription_events_subscription_idx
  on public.subscription_events (subscription_id);
-- A period can only be renewed (charged) once, however often renewals run.
create unique index if not exists subscription_events_one_renewal_per_period
  on public.subscription_events (subscription_id, period_end)
  where event_type = 'renewed';
create unique index if not exists subscription_events_one_end_per_subscription
  on public.subscription_events (subscription_id)
  where event_type = 'ended';

alter table public.subscription_events enable row level security;

drop policy if exists "Users can view their own subscription events" on public.subscription_events;
create policy "Users can view their own subscription events"
  on public.subscription_events for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Admins can view all subscription events" on public.subscription_events;
create policy "Admins can view all subscription events"
  on public.subscription_events for select
  to authenticated
  using (public.is_admin());

revoke all on table public.subscription_events from anon, authenticated;
grant select on table public.subscription_events to authenticated;

-- History for subscriptions created before this migration.
insert into public.subscription_events
  (subscription_id, user_id, event_type, plan_id, amount_cents, period_end, occurred_at)
select s.id, s.user_id, 'subscribed', s.plan_id, p.price_cents, s.current_period_end, s.started_at
from public.subscriptions s
join public.subscription_plans p on p.id = s.plan_id
where not exists (
  select 1 from public.subscription_events e
  where e.subscription_id = s.id and e.event_type in ('subscribed', 'resubscribed')
);

insert into public.subscription_events
  (subscription_id, user_id, event_type, plan_id, period_end, occurred_at)
select
  s.id,
  s.user_id,
  'ended',
  s.plan_id,
  least(coalesce(s.cancelled_at, s.current_period_end), s.current_period_end),
  least(coalesce(s.cancelled_at, s.current_period_end), s.current_period_end)
from public.subscriptions s
where s.status <> 'active'
on conflict (subscription_id) where event_type = 'ended' do nothing;


-- ---------------------------------------------------------------------
-- Internal helpers (not callable by clients)
-- ---------------------------------------------------------------------

create or replace function public.billing_step(p_interval text)
returns interval
language sql
immutable
set search_path = ''
as $$
  select case p_interval when 'year' then interval '1 year' else interval '1 month' end;
$$;

-- Raises unless the caller signed in with a password in the last 5 minutes.
-- The app confirms the password on a fresh session right before calling
-- start_subscription() or upgrade_subscription(), so an older session can't
-- skip that confirmation by calling them directly.
create or replace function public.require_recent_password()
returns void
language plpgsql
stable
set search_path = ''
as $$
declare
  v_amr jsonb := auth.jwt() -> 'amr';
begin
  if jsonb_typeof(v_amr) is distinct from 'array' or not exists (
    select 1
    from jsonb_array_elements(v_amr) as method
    where method ->> 'method' = 'password'
      and to_timestamp((method ->> 'timestamp')::double precision) > now() - interval '5 minutes'
  ) then
    raise exception 'Confirm your password to continue' using errcode = '42501';
  end if;
end;
$$;

-- Brings one subscription up to date and returns it, locked for the rest of
-- the transaction. A subscription whose period has ended either renews
-- (once per missed period, each recorded as a simulated charge, on the
-- scheduled plan if a switch is pending) or, if a cancellation or
-- downgrade was scheduled, expires. Idempotent: once current_period_end is
-- in the future it does nothing.
create or replace function public.settle_subscription(p_subscription_id uuid)
returns public.subscriptions
language plpgsql
set search_path = ''
as $$
declare
  v_subscription public.subscriptions;
  v_plan public.subscription_plans;
  v_step interval;
  v_periods integer := 1;
  v_next_end timestamptz;
begin
  select * into v_subscription
  from public.subscriptions
  where id = p_subscription_id
  for update;

  if not found or v_subscription.status <> 'active' or v_subscription.current_period_end > now() then
    return v_subscription;
  end if;

  if v_subscription.scheduled_change in ('cancel', 'downgrade') then
    update public.subscriptions
    set status = 'expired'
    where id = v_subscription.id
    returning * into v_subscription;

    insert into public.subscription_events
      (subscription_id, user_id, event_type, plan_id, period_end, occurred_at)
    values (
      v_subscription.id,
      v_subscription.user_id,
      'ended',
      v_subscription.plan_id,
      v_subscription.current_period_end,
      v_subscription.current_period_end
    )
    on conflict (subscription_id) where event_type = 'ended' do nothing;

    return v_subscription;
  end if;

  -- The new plan's billing cycle starts where the old period ended.
  if v_subscription.scheduled_change = 'switch_plan' then
    insert into public.subscription_events
      (subscription_id, user_id, event_type, plan_id, previous_plan_id, period_end, occurred_at)
    values (
      v_subscription.id,
      v_subscription.user_id,
      'switched',
      v_subscription.scheduled_plan_id,
      v_subscription.plan_id,
      v_subscription.current_period_end,
      v_subscription.current_period_end
    );

    update public.subscriptions
    set plan_id = scheduled_plan_id,
        billing_anchor = current_period_end,
        scheduled_change = null,
        scheduled_plan_id = null,
        scheduled_change_at = null
    where id = v_subscription.id
    returning * into v_subscription;
  end if;

  select * into v_plan from public.subscription_plans where id = v_subscription.plan_id;
  v_step := public.billing_step(v_plan.billing_interval);

  -- current_period_end = anchor + n steps; count from the anchor rather than
  -- adding a month to the last date, which would drift after a short month.
  while v_subscription.billing_anchor + v_step * v_periods <= v_subscription.current_period_end loop
    v_periods := v_periods + 1;
  end loop;

  while v_subscription.current_period_end <= now() loop
    v_next_end := v_subscription.billing_anchor + v_step * v_periods;

    insert into public.subscription_events
      (subscription_id, user_id, event_type, plan_id, amount_cents, period_end, occurred_at)
    values (
      v_subscription.id,
      v_subscription.user_id,
      'renewed',
      v_plan.id,
      v_plan.price_cents,
      v_next_end,
      v_subscription.current_period_end
    )
    on conflict (subscription_id, period_end) where event_type = 'renewed' do nothing;

    update public.subscriptions
    set current_period_end = v_next_end
    where id = v_subscription.id
    returning * into v_subscription;

    v_periods := v_periods + 1;
  end loop;

  return v_subscription;
end;
$$;

-- The caller's active subscription, brought up to date and locked, or a row
-- of nulls if they have none.
create or replace function public.settle_own_subscription()
returns public.subscriptions
language plpgsql
set search_path = ''
as $$
declare
  v_subscription_id uuid;
  v_subscription public.subscriptions;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;

  select id into v_subscription_id
  from public.subscriptions
  where user_id = auth.uid() and status = 'active';

  if found then
    v_subscription := public.settle_subscription(v_subscription_id);
  end if;

  return v_subscription;
end;
$$;

-- Cancel and downgrade share this: both turn off renewal and keep Echo+
-- until the period ends. p_change records which one the member chose.
-- Either replaces a pending switch to another plan.
create or replace function public.schedule_subscription_end(p_change text)
returns public.subscriptions
language plpgsql
set search_path = ''
as $$
declare
  v_subscription public.subscriptions;
begin
  if p_change is null or p_change not in ('cancel', 'downgrade') then
    raise exception 'Unknown change' using errcode = '22023';
  end if;

  v_subscription := public.settle_own_subscription();

  if v_subscription.id is null or v_subscription.status <> 'active' then
    raise exception 'No active subscription' using errcode = 'ES001';
  end if;

  if v_subscription.scheduled_change in ('cancel', 'downgrade') then
    raise exception 'Your subscription is already set to end' using errcode = 'ES002';
  end if;

  update public.subscriptions
  set scheduled_change = p_change, scheduled_plan_id = null, scheduled_change_at = now()
  where id = v_subscription.id
  returning * into v_subscription;

  insert into public.subscription_events
    (subscription_id, user_id, event_type, plan_id, period_end)
  values (
    v_subscription.id,
    v_subscription.user_id,
    case p_change when 'cancel' then 'cancellation_scheduled' else 'downgrade_scheduled' end,
    v_subscription.plan_id,
    v_subscription.current_period_end
  );

  return v_subscription;
end;
$$;


-- ---------------------------------------------------------------------
-- Functions the app calls
-- ---------------------------------------------------------------------

create or replace function public.has_active_subscription()
returns boolean
language sql
stable
set search_path = ''
as $$
  select exists (
    select 1
    from public.subscriptions
    where user_id = (select auth.uid())
      and status = 'active'
      and (
        current_period_end > now()
        or scheduled_change is null
        or scheduled_change = 'switch_plan'
      )
  );
$$;

-- Applies any renewal or expiry that's due on the caller's subscription.
create or replace function public.sync_my_subscription()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.settle_own_subscription();
end;
$$;

-- US-24 Subscribe to a Plan, US-29 Subscribe Again
create or replace function public.start_subscription(p_plan_id uuid)
returns public.subscriptions
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_plan public.subscription_plans;
  v_subscription public.subscriptions;
  v_returning boolean;
begin
  if v_user_id is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;

  perform public.require_recent_password();

  select * into v_plan
  from public.subscription_plans
  where id = p_plan_id and is_active;

  if not found then
    raise exception 'Plan not found' using errcode = 'P0002';
  end if;

  v_subscription := public.settle_own_subscription();

  if v_subscription.status = 'active' then
    raise exception 'You already have an active subscription' using errcode = '23505';
  end if;

  v_returning := exists (select 1 from public.subscriptions where user_id = v_user_id);

  -- subscriptions_one_active_per_user rejects a simultaneous second insert.
  insert into public.subscriptions (user_id, plan_id, current_period_end)
  values (v_user_id, v_plan.id, now() + public.billing_step(v_plan.billing_interval))
  returning * into v_subscription;

  insert into public.subscription_events
    (subscription_id, user_id, event_type, plan_id, amount_cents, period_end)
  values (
    v_subscription.id,
    v_user_id,
    case when v_returning then 'resubscribed' else 'subscribed' end,
    v_plan.id,
    v_plan.price_cents,
    v_subscription.current_period_end
  );

  return v_subscription;
end;
$$;

-- US-26 Upgrade Subscription: monthly to annual, effective immediately. The
-- new annual period starts now; no proration (payments are simulated).
create or replace function public.upgrade_subscription(p_plan_id uuid)
returns public.subscriptions
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_plan public.subscription_plans;
  v_current_plan public.subscription_plans;
  v_subscription public.subscriptions;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;

  perform public.require_recent_password();

  select * into v_plan
  from public.subscription_plans
  where id = p_plan_id and is_active;

  if not found then
    raise exception 'Plan not found' using errcode = 'P0002';
  end if;

  v_subscription := public.settle_own_subscription();

  if v_subscription.id is null or v_subscription.status <> 'active' then
    raise exception 'No active subscription' using errcode = 'ES001';
  end if;

  if v_subscription.plan_id = v_plan.id then
    raise exception 'You are already on this plan' using errcode = '23505';
  end if;

  select * into v_current_plan from public.subscription_plans where id = v_subscription.plan_id;

  if not (v_current_plan.billing_interval = 'month' and v_plan.billing_interval = 'year') then
    raise exception 'Only monthly plans can be upgraded to annual' using errcode = 'ES003';
  end if;

  -- Paying for a new annual period also turns renewal back on.
  update public.subscriptions
  set plan_id = v_plan.id,
      billing_anchor = now(),
      current_period_end = now() + public.billing_step(v_plan.billing_interval),
      scheduled_change = null,
      scheduled_plan_id = null,
      scheduled_change_at = null
  where id = v_subscription.id
  returning * into v_subscription;

  insert into public.subscription_events
    (subscription_id, user_id, event_type, plan_id, previous_plan_id, amount_cents, period_end)
  values (
    v_subscription.id,
    v_subscription.user_id,
    'upgraded',
    v_plan.id,
    v_current_plan.id,
    v_plan.price_cents,
    v_subscription.current_period_end
  );

  return v_subscription;
end;
$$;

-- Annual to monthly, at the next renewal: the member keeps the year they
-- paid for, then renews monthly.
create or replace function public.switch_subscription_plan(p_plan_id uuid)
returns public.subscriptions
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_plan public.subscription_plans;
  v_current_plan public.subscription_plans;
  v_subscription public.subscriptions;
begin
  select * into v_plan
  from public.subscription_plans
  where id = p_plan_id and is_active;

  if not found then
    raise exception 'Plan not found' using errcode = 'P0002';
  end if;

  v_subscription := public.settle_own_subscription();

  if v_subscription.id is null or v_subscription.status <> 'active' then
    raise exception 'No active subscription' using errcode = 'ES001';
  end if;

  if v_subscription.plan_id = v_plan.id then
    raise exception 'You are already on this plan' using errcode = '23505';
  end if;

  if v_subscription.scheduled_change is not null then
    raise exception 'A change is already scheduled' using errcode = 'ES002';
  end if;

  select * into v_current_plan from public.subscription_plans where id = v_subscription.plan_id;

  if not (v_current_plan.billing_interval = 'year' and v_plan.billing_interval = 'month') then
    raise exception 'Only annual plans can switch to monthly' using errcode = 'ES003';
  end if;

  update public.subscriptions
  set scheduled_change = 'switch_plan', scheduled_plan_id = v_plan.id, scheduled_change_at = now()
  where id = v_subscription.id
  returning * into v_subscription;

  insert into public.subscription_events
    (subscription_id, user_id, event_type, plan_id, previous_plan_id, period_end)
  values (
    v_subscription.id,
    v_subscription.user_id,
    'switch_scheduled',
    v_plan.id,
    v_current_plan.id,
    v_subscription.current_period_end
  );

  return v_subscription;
end;
$$;

-- US-28 Cancel My Subscription. Previously this ended Echo+ immediately; it
-- now stops renewal and keeps access until the period ends.
drop function if exists public.cancel_subscription();
create function public.cancel_subscription()
returns public.subscriptions
language plpgsql
security definer
set search_path = ''
as $$
begin
  return public.schedule_subscription_end('cancel');
end;
$$;

-- US-27 Downgrade to Basic (Echo Free) when the current period ends.
create or replace function public.downgrade_subscription()
returns public.subscriptions
language plpgsql
security definer
set search_path = ''
as $$
begin
  return public.schedule_subscription_end('downgrade');
end;
$$;

-- US-29 Subscribe Again, before the period ends: undoes a scheduled
-- cancellation, downgrade or plan switch. The plan, period and renewal
-- date stay the same.
create or replace function public.resume_subscription()
returns public.subscriptions
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_subscription public.subscriptions;
  v_undone text;
begin
  v_subscription := public.settle_own_subscription();

  if v_subscription.id is null or v_subscription.status <> 'active' then
    raise exception 'No active subscription' using errcode = 'ES001';
  end if;

  if v_subscription.scheduled_change is null then
    raise exception 'Your subscription already renews automatically' using errcode = 'ES002';
  end if;

  v_undone := v_subscription.scheduled_change;

  update public.subscriptions
  set scheduled_change = null, scheduled_plan_id = null, scheduled_change_at = null
  where id = v_subscription.id
  returning * into v_subscription;

  insert into public.subscription_events
    (subscription_id, user_id, event_type, plan_id, period_end)
  values (
    v_subscription.id,
    v_subscription.user_id,
    case v_undone when 'switch_plan' then 'switch_cancelled' else 'reactivated' end,
    v_subscription.plan_id,
    v_subscription.current_period_end
  );

  return v_subscription;
end;
$$;

-- Renews or expires every subscription that's due. For a scheduled job (see
-- supabase/README.md); not callable from the app.
create or replace function public.process_subscription_renewals()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_subscription_id uuid;
  v_count integer := 0;
begin
  for v_subscription_id in
    select id from public.subscriptions
    where status = 'active' and current_period_end <= now()
  loop
    perform public.settle_subscription(v_subscription_id);
    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;


-- ---------------------------------------------------------------------
-- Function permissions
-- ---------------------------------------------------------------------

revoke execute on function public.billing_step(text) from public, anon, authenticated;
revoke execute on function public.require_recent_password() from public, anon, authenticated;
revoke execute on function public.settle_subscription(uuid) from public, anon, authenticated;
revoke execute on function public.settle_own_subscription() from public, anon, authenticated;
revoke execute on function public.schedule_subscription_end(text) from public, anon, authenticated;
revoke execute on function public.process_subscription_renewals() from public, anon, authenticated;

revoke execute on function public.has_active_subscription() from public, anon, authenticated;
grant execute on function public.has_active_subscription() to authenticated;

revoke execute on function public.sync_my_subscription() from public, anon, authenticated;
grant execute on function public.sync_my_subscription() to authenticated;

revoke execute on function public.start_subscription(uuid) from public, anon, authenticated;
grant execute on function public.start_subscription(uuid) to authenticated;

revoke execute on function public.upgrade_subscription(uuid) from public, anon, authenticated;
grant execute on function public.upgrade_subscription(uuid) to authenticated;

revoke execute on function public.switch_subscription_plan(uuid) from public, anon, authenticated;
grant execute on function public.switch_subscription_plan(uuid) to authenticated;

revoke execute on function public.cancel_subscription() from public, anon, authenticated;
grant execute on function public.cancel_subscription() to authenticated;

revoke execute on function public.downgrade_subscription() from public, anon, authenticated;
grant execute on function public.downgrade_subscription() to authenticated;

revoke execute on function public.resume_subscription() from public, anon, authenticated;
grant execute on function public.resume_subscription() to authenticated;
