-- =====================================================================
-- Echo: US-61 to US-65 User Management
--
-- Run in Supabase Dashboard > SQL Editor > New query after the earlier
-- migrations. Safe to re-run. Doesn't change any existing account,
-- subscription, watchlist, rating or viewing data.
--
--   profiles.deactivated_at   null = active; otherwise when an admin
--                             deactivated the account
--
-- A deactivated account keeps its sign-in, profile and every row it owns.
-- Subscriptions keep following their own schedule. While deactivated:
--   - every insert, update or delete made with that account's session is
--     refused, including through the security definer functions
--     (subscribing, cancelling, deleting the account, ...);
--   - its own rows are hidden from direct API reads.
-- Reactivating clears deactivated_at; access then follows the account's
-- current subscription, as it would have without the deactivation.
--
-- Only admins can list accounts, read their details or change their
-- status, through the functions below. Admin accounts can't be
-- deactivated by anyone. Roles are still only set in the Dashboard.
--
-- Errors raised for the app to handle:
--   42501  not an admin, or the caller's own account is deactivated
--   P0002  account not found
--   22023  invalid search, filter or page
--   EU001  admin accounts can't be deactivated
-- =====================================================================


alter table public.profiles add column if not exists deactivated_at timestamptz;

comment on column public.profiles.deactivated_at is
  'null = active. Set and cleared only by admin_set_user_active(); admin accounts can''t be deactivated.';

create index if not exists profiles_deactivated_idx
  on public.profiles (deactivated_at)
  where deactivated_at is not null;


-- ---------------------------------------------------------------------
-- The caller's account status
-- ---------------------------------------------------------------------

-- True for active accounts and for visitors (no account to deactivate).
-- Security definer so policies on profiles can use it without recursion.
create or replace function public.is_account_active()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select not exists (
    select 1
    from public.profiles
    where id = (select auth.uid())
      and deactivated_at is not null
  );
$$;


-- ---------------------------------------------------------------------
-- Deactivated accounts can't write
-- ---------------------------------------------------------------------

-- Statement trigger, so it also covers the security definer functions
-- that bypass RLS. auth.uid() is the session's user even inside those
-- functions, and is null for scheduled jobs and Dashboard edits.
create or replace function public.reject_deactivated_writes()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_account_active() then
    raise exception 'This account has been deactivated' using errcode = '42501';
  end if;
  return null;
end;
$$;

do $$
declare
  v_table text;
begin
  foreach v_table in array array[
    'profiles', 'subscriptions', 'subscription_events', 'watchlist', 'viewing_status', 'ratings'
  ] loop
    execute format('drop trigger if exists %I on public.%I', v_table || '_reject_deactivated', v_table);
    execute format(
      'create trigger %I before insert or update or delete on public.%I '
        || 'for each statement execute function public.reject_deactivated_writes()',
      v_table || '_reject_deactivated',
      v_table
    );

    execute format('drop policy if exists "Deactivated accounts can''t read" on public.%I', v_table);
    execute format(
      'create policy "Deactivated accounts can''t read" on public.%I as restrictive '
        || 'for select to authenticated using ((select public.is_account_active()))',
      v_table
    );
  end loop;
end;
$$;


-- ---------------------------------------------------------------------
-- deactivated_at can't be changed through the API
-- ---------------------------------------------------------------------

-- Same as 20261107000000_admin_role_guard.sql, plus deactivated_at. The
-- column grants already stop this; the trigger keeps it that way if a
-- broader grant is added later. admin_set_user_active() runs as its owner,
-- so it isn't affected.
create or replace function public.protect_profile_role()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user not in ('anon', 'authenticated') then
    return new;
  end if;

  if tg_op = 'INSERT' and new.role is distinct from 'user' then
    raise exception 'Roles can only be assigned in the Supabase Dashboard' using errcode = '42501';
  end if;

  if tg_op = 'UPDATE' and new.role is distinct from old.role then
    raise exception 'Roles can only be changed in the Supabase Dashboard' using errcode = '42501';
  end if;

  if tg_op = 'INSERT' and new.deactivated_at is not null then
    raise exception 'Only admins can deactivate accounts' using errcode = '42501';
  end if;

  if tg_op = 'UPDATE' and new.deactivated_at is distinct from old.deactivated_at then
    raise exception 'Only admins can change account status' using errcode = '42501';
  end if;

  return new;
end;
$$;


-- ---------------------------------------------------------------------
-- Admin functions
-- ---------------------------------------------------------------------

create or replace function public.require_active_admin()
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() or not public.is_account_active() then
    raise exception 'Admin access required' using errcode = '42501';
  end if;
end;
$$;

-- The plan that currently gives Echo+, by the same rule as
-- has_active_subscription(); null means Free.
create or replace function public.current_subscription(p_user_id uuid)
returns public.subscriptions
language sql
stable
security definer
set search_path = ''
as $$
  select s.*
  from public.subscriptions s
  where s.user_id = p_user_id
    and s.status = 'active'
    and (
      s.current_period_end > now()
      or s.scheduled_change is null
      or s.scheduled_change = 'switch_plan'
    )
  limit 1;
$$;

-- US-61 View User Accounts, US-62 Search User Accounts
-- One page of accounts, newest first, with the number that match.
-- p_search matches name or email (case-insensitive); p_status is
-- 'all', 'active' or 'deactivated'.
create or replace function public.admin_list_users(
  p_search text default null,
  p_status text default 'all',
  p_limit integer default 20,
  p_offset integer default 0
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_search text := nullif(trim(coalesce(p_search, '')), '');
  v_pattern text;
  v_total bigint;
  v_users jsonb;
begin
  perform public.require_active_admin();

  if p_status is null or p_status not in ('all', 'active', 'deactivated')
    or p_limit is null or p_limit not between 1 and 50
    or p_offset is null or p_offset < 0
    or char_length(coalesce(v_search, '')) > 100 then
    raise exception 'Invalid user search' using errcode = '22023';
  end if;

  if v_search is not null then
    v_pattern := '%' || replace(replace(replace(v_search, '\', '\\'), '%', '\%'), '_', '\_') || '%';
  end if;

  with matched as (
    select p.id, p.full_name, u.email::text as email, p.role, u.created_at, p.deactivated_at
    from public.profiles p
    join auth.users u on u.id = p.id
    where (
        p_status = 'all'
        or (p_status = 'active' and p.deactivated_at is null)
        or (p_status = 'deactivated' and p.deactivated_at is not null)
      )
      and (v_pattern is null or p.full_name ilike v_pattern or u.email ilike v_pattern)
  ),
  page as (
    select *
    from matched
    order by created_at desc, id
    limit p_limit offset p_offset
  )
  select
    (select count(*) from matched),
    coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'id', page.id,
            'full_name', page.full_name,
            'email', page.email,
            'role', page.role,
            'created_at', page.created_at,
            'deactivated_at', page.deactivated_at,
            'billing_interval', plan.billing_interval
          )
          order by page.created_at desc, page.id
        )
        from page
        left join lateral public.current_subscription(page.id) s on s.id is not null
        left join public.subscription_plans plan on plan.id = s.plan_id
      ),
      '[]'::jsonb
    )
  into v_total, v_users;

  return jsonb_build_object('total', v_total, 'users', v_users);
end;
$$;

-- US-63 View User Account Details
create or replace function public.admin_get_user(p_user_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_account jsonb;
  v_subscription public.subscriptions;
begin
  perform public.require_active_admin();

  select jsonb_build_object(
    'id', p.id,
    'full_name', p.full_name,
    'email', u.email,
    'role', p.role,
    'created_at', u.created_at,
    'deactivated_at', p.deactivated_at
  )
  into v_account
  from public.profiles p
  join auth.users u on u.id = p.id
  where p.id = p_user_id;

  if v_account is null then
    raise exception 'Account not found' using errcode = 'P0002';
  end if;

  v_subscription := public.current_subscription(p_user_id);
  if v_subscription.id is null then
    return v_account || jsonb_build_object('subscription', null);
  end if;

  return v_account || jsonb_build_object('subscription', (
    select jsonb_build_object(
      'billing_interval', plan.billing_interval,
      'status', v_subscription.status,
      'started_at', v_subscription.started_at,
      'current_period_end', v_subscription.current_period_end,
      'scheduled_change', v_subscription.scheduled_change,
      'scheduled_billing_interval', scheduled.billing_interval
    )
    from public.subscription_plans plan
    left join public.subscription_plans scheduled on scheduled.id = v_subscription.scheduled_plan_id
    where plan.id = v_subscription.plan_id
  ));
end;
$$;

-- US-64 Deactivate a User Account, US-65 Reactivate a User Account
-- Returns the account's deactivated_at after the change (null = active).
-- Locks the profile so a concurrent role change can't slip past the check.
create or replace function public.admin_set_user_active(p_user_id uuid, p_active boolean)
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_profile public.profiles;
  v_deactivated_at timestamptz;
begin
  perform public.require_active_admin();

  if p_active is null then
    raise exception 'Choose activate or deactivate' using errcode = '22023';
  end if;

  select * into v_profile
  from public.profiles
  where id = p_user_id
  for update;

  if not found then
    raise exception 'Account not found' using errcode = 'P0002';
  end if;

  if not p_active and (v_profile.role = 'admin' or v_profile.id = (select auth.uid())) then
    raise exception 'Administrator accounts can''t be deactivated' using errcode = 'EU001';
  end if;

  update public.profiles
  set deactivated_at = case when p_active then null else coalesce(deactivated_at, now()) end
  where id = p_user_id
  returning deactivated_at into v_deactivated_at;

  return v_deactivated_at;
end;
$$;


-- ---------------------------------------------------------------------
-- Function permissions (Supabase grants EXECUTE to everyone by default)
-- ---------------------------------------------------------------------

revoke execute on function public.is_account_active() from public, anon, authenticated;
grant execute on function public.is_account_active() to authenticated;

revoke execute on function public.reject_deactivated_writes() from public, anon, authenticated;
revoke execute on function public.protect_profile_role() from public, anon, authenticated;
revoke execute on function public.require_active_admin() from public, anon, authenticated;
revoke execute on function public.current_subscription(uuid) from public, anon, authenticated;

revoke execute on function public.admin_list_users(text, text, integer, integer) from public, anon, authenticated;
grant execute on function public.admin_list_users(text, text, integer, integer) to authenticated;

revoke execute on function public.admin_get_user(uuid) from public, anon, authenticated;
grant execute on function public.admin_get_user(uuid) to authenticated;

revoke execute on function public.admin_set_user_active(uuid, boolean) from public, anon, authenticated;
grant execute on function public.admin_set_user_active(uuid, boolean) to authenticated;
