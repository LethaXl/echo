-- =====================================================================
-- Echo: US-58 Set Plan Availability, US-59 Edit Plan Benefits,
--       US-60 Update Plan Prices
--
-- Run in Supabase Dashboard > SQL Editor > New query after the earlier
-- migrations (including 20261107000000_admin_role_guard.sql). Safe to
-- re-run.
--
-- subscription_plans
--   is_available   paid plans only: whether new members can choose it.
--                  Unavailable plans stay listed (is_active) so the Plans
--                  page can show them, and existing subscribers keep them.
--   is_free        the Echo (Free) plan's row, added here so its benefits
--                  live with the others. It has no billing period, is
--                  always $0 and available, and can never be subscribed
--                  to: Free still means "no active subscription".
--   features       the ordered benefits shown on the Plans page. Display
--                  text only; Echo+ access never depends on it.
--   Admins may update only price_cents, features and is_available.
--
-- subscriptions
--   price_cents             what this subscription is charged each period,
--                           fixed when the plan was chosen. Changing a
--                           plan's price only affects new choices.
--   scheduled_price_cents   for a scheduled switch_plan, the new plan's
--                           price when the switch was requested.
--
-- Existing active subscriptions take price_cents from their most recent
-- recorded charge on their current plan (subscription_events). Any without
-- a recorded charge keep price_cents null: they're charged the plan's price
-- at their next renewal, which then becomes their fixed price. Existing
-- scheduled switches likewise keep scheduled_price_cents null and use the
-- new plan's price when the switch happens.
--
-- New errors raised for the app:
--   ES004  the plan isn't available to choose right now
--   ES005  the plan's price changed since the member saw it
-- =====================================================================


-- ---------------------------------------------------------------------
-- subscription_plans
-- ---------------------------------------------------------------------

alter table public.subscription_plans
  add column if not exists is_available boolean not null default true,
  add column if not exists is_free boolean not null default false;

alter table public.subscription_plans alter column billing_interval drop not null;

insert into public.subscription_plans
  (slug, name, description, price_cents, billing_interval, features, is_free, sort_order)
values (
  'echo-free',
  'Echo',
  'Browse, search and explore movies and shows.',
  0,
  null,
  array['Browse movies and shows', 'Search by title', 'Details, cast, seasons and episodes'],
  true,
  0
)
on conflict (slug) do nothing;

-- The Echo+ benefits the Plans page showed until now. Only replaces the
-- original seed lists, which were never displayed, so admin edits survive
-- a re-run.
update public.subscription_plans
set features = array['Watchlist', 'Simulated viewing', 'Rate movies and shows']
where slug in ('echo-plus-monthly', 'echo-plus-annual')
  and features in (
    array['Simulated viewing of all movies and shows', 'Track viewing progress', 'Cancel anytime'],
    array['Simulated viewing of all movies and shows', 'Track viewing progress', 'Two months free compared to monthly']
  );

create unique index if not exists subscription_plans_one_free_plan
  on public.subscription_plans (is_free)
  where is_free;

alter table public.subscription_plans drop constraint if exists subscription_plans_kind_check;
alter table public.subscription_plans add constraint subscription_plans_kind_check check (
  (is_free and price_cents = 0 and billing_interval is null and is_available and is_active)
  or (not is_free and billing_interval is not null)
);

-- 1 to 12 benefits, each 1 to 120 characters with no surrounding spaces,
-- and no duplicates (ignoring case). The app trims and checks the same.
create or replace function public.plan_features_are_valid(p_features text[])
returns boolean
language sql
immutable
set search_path = ''
as $$
  select cardinality(p_features) between 1 and 12
    and array_position(p_features, null) is null
    and not exists (
      select 1
      from unnest(p_features) as feature
      where feature <> btrim(feature) or char_length(feature) not between 1 and 120
    )
    and (select count(distinct lower(feature)) from unnest(p_features) as feature)
      = cardinality(p_features);
$$;

-- NOT VALID: enforced for every change from now on without failing on
-- rows edited before this migration.
alter table public.subscription_plans drop constraint if exists subscription_plans_features_check;
alter table public.subscription_plans add constraint subscription_plans_features_check
  check (public.plan_features_are_valid(features)) not valid;

alter table public.subscription_plans drop constraint if exists subscription_plans_price_cents_max;
alter table public.subscription_plans add constraint subscription_plans_price_cents_max
  check (price_cents <= 99999) not valid;

-- Admins edit existing plans only; creating or deleting plans (including
-- the Free plan) isn't possible from the app.
drop policy if exists "Admins can create plans" on public.subscription_plans;
drop policy if exists "Admins can delete plans" on public.subscription_plans;
revoke insert, update, delete on table public.subscription_plans from anon, authenticated;
grant update (price_cents, features, is_available) on table public.subscription_plans to authenticated;


-- ---------------------------------------------------------------------
-- subscriptions: price snapshots
-- ---------------------------------------------------------------------

alter table public.subscriptions
  add column if not exists price_cents integer,
  add column if not exists scheduled_price_cents integer;

alter table public.subscriptions drop constraint if exists subscriptions_price_cents_check;
alter table public.subscriptions add constraint subscriptions_price_cents_check check (
  (price_cents is null or price_cents >= 0)
  and (scheduled_price_cents is null or scheduled_price_cents >= 0)
);

alter table public.subscriptions drop constraint if exists subscriptions_scheduled_change_check;
alter table public.subscriptions add constraint subscriptions_scheduled_change_check check (
  (
    scheduled_change is null
    and scheduled_plan_id is null
    and scheduled_change_at is null
    and scheduled_price_cents is null
  )
  or (
    scheduled_change in ('cancel', 'downgrade')
    and scheduled_plan_id is null
    and scheduled_change_at is not null
    and scheduled_price_cents is null
  )
  or (
    scheduled_change = 'switch_plan'
    and scheduled_plan_id is not null
    and scheduled_change_at is not null
  )
);

-- Recorded charges are the only reliable record of what a member paid, so
-- only active subscriptions with one are filled in; see the header.
update public.subscriptions s
set price_cents = (
  select e.amount_cents
  from public.subscription_events e
  where e.subscription_id = s.id
    and e.plan_id = s.plan_id
    and e.event_type in ('subscribed', 'resubscribed', 'upgraded', 'renewed')
    and e.amount_cents is not null
  order by e.occurred_at desc, e.period_end desc
  limit 1
)
where s.status = 'active'
  and s.price_cents is null
  and exists (
    select 1
    from public.subscription_events e
    where e.subscription_id = s.id
      and e.plan_id = s.plan_id
      and e.event_type in ('subscribed', 'resubscribed', 'upgraded', 'renewed')
      and e.amount_cents is not null
  );


-- ---------------------------------------------------------------------
-- Subscription functions: charge the subscription's own price, and only
-- let members choose available plans at the price they were shown
-- ---------------------------------------------------------------------

-- The paid plan a member is choosing, locked so its price and availability
-- can't change before the choice is saved.
create or replace function public.choosable_plan(p_plan_id uuid, p_expected_price_cents integer)
returns public.subscription_plans
language plpgsql
set search_path = ''
as $$
declare
  v_plan public.subscription_plans;
begin
  select * into v_plan
  from public.subscription_plans
  where id = p_plan_id and is_active and not is_free
  for share;

  if not found then
    raise exception 'Plan not found' using errcode = 'P0002';
  end if;

  if not v_plan.is_available then
    raise exception 'This plan is not available right now' using errcode = 'ES004';
  end if;

  if p_expected_price_cents is not null and p_expected_price_cents <> v_plan.price_cents then
    raise exception 'The price of this plan has changed' using errcode = 'ES005';
  end if;

  return v_plan;
end;
$$;

create or replace function public.settle_subscription(p_subscription_id uuid)
returns public.subscriptions
language plpgsql
set search_path = ''
as $$
declare
  v_subscription public.subscriptions;
  v_plan public.subscription_plans;
  v_price integer;
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

  -- The new plan's billing cycle starts where the old period ended, at the
  -- price agreed when the switch was scheduled. A scheduled switch keeps
  -- going even if the plan has since been made unavailable.
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
        price_cents = coalesce(
          scheduled_price_cents,
          (select p.price_cents from public.subscription_plans p where p.id = scheduled_plan_id)
        ),
        billing_anchor = current_period_end,
        scheduled_change = null,
        scheduled_plan_id = null,
        scheduled_change_at = null,
        scheduled_price_cents = null
    where id = v_subscription.id
    returning * into v_subscription;
  end if;

  select * into v_plan from public.subscription_plans where id = v_subscription.plan_id;
  v_step := public.billing_step(v_plan.billing_interval);
  -- Subscriptions from before price snapshots have no price yet; their
  -- first renewal fixes it at the plan's price then.
  v_price := coalesce(v_subscription.price_cents, v_plan.price_cents);

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
      v_price,
      v_next_end,
      v_subscription.current_period_end
    )
    on conflict (subscription_id, period_end) where event_type = 'renewed' do nothing;

    update public.subscriptions
    set current_period_end = v_next_end, price_cents = v_price
    where id = v_subscription.id
    returning * into v_subscription;

    v_periods := v_periods + 1;
  end loop;

  return v_subscription;
end;
$$;

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
  set scheduled_change = p_change,
      scheduled_plan_id = null,
      scheduled_change_at = now(),
      scheduled_price_cents = null
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

-- The functions the app calls now take the price the member was shown.
drop function if exists public.start_subscription(uuid);
drop function if exists public.upgrade_subscription(uuid);
drop function if exists public.switch_subscription_plan(uuid);

-- US-24 Subscribe to a Plan, US-29 Subscribe Again
create or replace function public.start_subscription(
  p_plan_id uuid,
  p_expected_price_cents integer default null
)
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

  v_plan := public.choosable_plan(p_plan_id, p_expected_price_cents);
  v_subscription := public.settle_own_subscription();

  if v_subscription.status = 'active' then
    raise exception 'You already have an active subscription' using errcode = '23505';
  end if;

  v_returning := exists (select 1 from public.subscriptions where user_id = v_user_id);

  -- subscriptions_one_active_per_user rejects a simultaneous second insert.
  insert into public.subscriptions (user_id, plan_id, price_cents, current_period_end)
  values (
    v_user_id,
    v_plan.id,
    v_plan.price_cents,
    now() + public.billing_step(v_plan.billing_interval)
  )
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

-- US-26 Upgrade Subscription: monthly to annual, effective immediately, at
-- the annual plan's current price.
create or replace function public.upgrade_subscription(
  p_plan_id uuid,
  p_expected_price_cents integer default null
)
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

  v_plan := public.choosable_plan(p_plan_id, p_expected_price_cents);
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
      price_cents = v_plan.price_cents,
      billing_anchor = now(),
      current_period_end = now() + public.billing_step(v_plan.billing_interval),
      scheduled_change = null,
      scheduled_plan_id = null,
      scheduled_change_at = null,
      scheduled_price_cents = null
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

-- Annual to monthly, at the next renewal, at the monthly price when the
-- switch is requested.
create or replace function public.switch_subscription_plan(
  p_plan_id uuid,
  p_expected_price_cents integer default null
)
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
  v_plan := public.choosable_plan(p_plan_id, p_expected_price_cents);
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
  set scheduled_change = 'switch_plan',
      scheduled_plan_id = v_plan.id,
      scheduled_change_at = now(),
      scheduled_price_cents = v_plan.price_cents
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

-- US-29 Subscribe Again, before the period ends. The plan, price and
-- renewal date stay the same.
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
  set scheduled_change = null,
      scheduled_plan_id = null,
      scheduled_change_at = null,
      scheduled_price_cents = null
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


-- ---------------------------------------------------------------------
-- Function permissions
-- ---------------------------------------------------------------------

revoke execute on function public.choosable_plan(uuid, integer) from public, anon, authenticated;

revoke execute on function public.start_subscription(uuid, integer) from public, anon, authenticated;
grant execute on function public.start_subscription(uuid, integer) to authenticated;

revoke execute on function public.upgrade_subscription(uuid, integer) from public, anon, authenticated;
grant execute on function public.upgrade_subscription(uuid, integer) to authenticated;

revoke execute on function public.switch_subscription_plan(uuid, integer) from public, anon, authenticated;
grant execute on function public.switch_subscription_plan(uuid, integer) to authenticated;
