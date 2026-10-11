-- =====================================================================
-- Echo: US-24 Subscribe to a Plan
--
-- Run in Supabase Dashboard > SQL Editor > New query after the initial
-- schema. Safe to re-run.
--
-- start_subscription() now only works on a session that signed in with a
-- password in the last 5 minutes. The app confirms the password on a fresh
-- session before subscribing, so this stops anyone calling the function
-- directly with an older session to skip that confirmation.
--
-- Everything else is unchanged: one active subscription per user (enforced
-- by subscriptions_one_active_per_user), dates set server-side, and renewal
-- dates from Postgres interval arithmetic, which keeps month ends valid
-- (Jan 31 + 1 month = Feb 28/29, Feb 29 + 1 year = Feb 28).
-- =====================================================================

create or replace function public.start_subscription(p_plan_id uuid)
returns public.subscriptions
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_amr jsonb := auth.jwt() -> 'amr';
  v_plan public.subscription_plans;
  v_subscription public.subscriptions;
begin
  if v_user_id is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;

  if jsonb_typeof(v_amr) is distinct from 'array' or not exists (
    select 1
    from jsonb_array_elements(v_amr) as method
    where method ->> 'method' = 'password'
      and to_timestamp((method ->> 'timestamp')::double precision) > now() - interval '5 minutes'
  ) then
    raise exception 'Confirm your password to subscribe' using errcode = '42501';
  end if;

  select * into v_plan
  from public.subscription_plans
  where id = p_plan_id and is_active;

  if not found then
    raise exception 'Plan not found' using errcode = 'P0002';
  end if;

  update public.subscriptions
  set status = 'expired'
  where user_id = v_user_id
    and status = 'active'
    and current_period_end <= now();

  if exists (
    select 1 from public.subscriptions
    where user_id = v_user_id and status = 'active'
  ) then
    raise exception 'You already have an active subscription' using errcode = '23505';
  end if;

  insert into public.subscriptions (user_id, plan_id, current_period_end)
  values (
    v_user_id,
    v_plan.id,
    now() + case v_plan.billing_interval
      when 'year' then interval '1 year'
      else interval '1 month'
    end
  )
  returning * into v_subscription;

  return v_subscription;
end;
$$;

revoke execute on function public.start_subscription(uuid) from public, anon, authenticated;
grant execute on function public.start_subscription(uuid) to authenticated;
