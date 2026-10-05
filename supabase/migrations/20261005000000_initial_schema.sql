-- =====================================================================
-- Echo: initial database schema
--
-- Run in Supabase Dashboard > SQL Editor > New query. Safe to re-run.
--
-- Tables
--   profiles             one row per auth user (name, role)
--   subscription_plans   public list of Echo+ plans
--   subscriptions        simulated Echo+ subscriptions
--   watchlist            titles a user saved
--   viewing_status       simulated viewing progress (Echo+ only)
--   ratings              a user's 1-5 rating of a title
--
-- Movie/TV metadata is NOT stored here; rows reference TMDB with
-- (tmdb_id, media_type).
-- =====================================================================


-- ---------------------------------------------------------------------
-- Shared helpers
-- ---------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;


-- ---------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text check (full_name is null or char_length(trim(full_name)) between 1 and 100),
  role text not null default 'user' check (role in ('user', 'admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Security definer so policies can check the caller's role without
-- recursively triggering RLS on profiles.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles
    where id = (select auth.uid())
      and role = 'admin'
  );
$$;

-- Creates a profile automatically when someone signs up.
-- Sign-up code can pass the name via options.data.full_name.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name)
  values (
    new.id,
    left(nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''), 100)
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Backfill profiles for any users created before this script ran.
insert into public.profiles (id, full_name)
select
  u.id,
  left(nullif(trim(u.raw_user_meta_data ->> 'full_name'), ''), 100)
from auth.users u
on conflict (id) do nothing;

alter table public.profiles enable row level security;

drop policy if exists "Users can view their own profile" on public.profiles;
create policy "Users can view their own profile"
  on public.profiles for select
  to authenticated
  using ((select auth.uid()) = id);

drop policy if exists "Admins can view all profiles" on public.profiles;
create policy "Admins can view all profiles"
  on public.profiles for select
  to authenticated
  using (public.is_admin());

drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile"
  on public.profiles for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- Users may only change their name. Without this column-level grant a
-- user could promote themselves by updating their own role.
revoke all on table public.profiles from anon, authenticated;
grant select on table public.profiles to authenticated;
grant update (full_name) on table public.profiles to authenticated;


-- ---------------------------------------------------------------------
-- subscription_plans (public catalogue of plans)
-- ---------------------------------------------------------------------

create table if not exists public.subscription_plans (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text,
  price_cents integer not null check (price_cents >= 0),
  billing_interval text not null check (billing_interval in ('month', 'year')),
  features text[] not null default '{}',
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists subscription_plans_set_updated_at on public.subscription_plans;
create trigger subscription_plans_set_updated_at
  before update on public.subscription_plans
  for each row execute function public.set_updated_at();

alter table public.subscription_plans enable row level security;

-- Plans are intentionally public so visitors can compare them before signing up.
drop policy if exists "Anyone can view active plans" on public.subscription_plans;
create policy "Anyone can view active plans"
  on public.subscription_plans for select
  to anon, authenticated
  using (is_active);

drop policy if exists "Admins can view all plans" on public.subscription_plans;
create policy "Admins can view all plans"
  on public.subscription_plans for select
  to authenticated
  using (public.is_admin());

drop policy if exists "Admins can create plans" on public.subscription_plans;
create policy "Admins can create plans"
  on public.subscription_plans for insert
  to authenticated
  with check (public.is_admin());

drop policy if exists "Admins can update plans" on public.subscription_plans;
create policy "Admins can update plans"
  on public.subscription_plans for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "Admins can delete plans" on public.subscription_plans;
create policy "Admins can delete plans"
  on public.subscription_plans for delete
  to authenticated
  using (public.is_admin());

revoke all on table public.subscription_plans from anon, authenticated;
grant select on table public.subscription_plans to anon, authenticated;
grant insert, update, delete on table public.subscription_plans to authenticated;


-- ---------------------------------------------------------------------
-- subscriptions (simulated, no payments)
-- ---------------------------------------------------------------------

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  plan_id uuid not null references public.subscription_plans (id),
  status text not null default 'active' check (status in ('active', 'cancelled', 'expired')),
  started_at timestamptz not null default now(),
  current_period_end timestamptz not null,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (current_period_end > started_at)
);

create unique index if not exists subscriptions_one_active_per_user
  on public.subscriptions (user_id)
  where status = 'active';
create index if not exists subscriptions_user_id_idx on public.subscriptions (user_id);
create index if not exists subscriptions_plan_id_idx on public.subscriptions (plan_id);

drop trigger if exists subscriptions_set_updated_at on public.subscriptions;
create trigger subscriptions_set_updated_at
  before update on public.subscriptions
  for each row execute function public.set_updated_at();

alter table public.subscriptions enable row level security;

drop policy if exists "Users can view their own subscriptions" on public.subscriptions;
create policy "Users can view their own subscriptions"
  on public.subscriptions for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Admins can view all subscriptions" on public.subscriptions;
create policy "Admins can view all subscriptions"
  on public.subscriptions for select
  to authenticated
  using (public.is_admin());

-- No insert/update/delete policies: users change subscriptions only through
-- start_subscription() and cancel_subscription(), which set dates server-side.
revoke all on table public.subscriptions from anon, authenticated;
grant select on table public.subscriptions to authenticated;

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
      and current_period_end > now()
  );
$$;

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
begin
  if v_user_id is null then
    raise exception 'Not authenticated' using errcode = '42501';
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

create or replace function public.cancel_subscription()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;

  update public.subscriptions
  set status = 'cancelled', cancelled_at = now()
  where user_id = v_user_id and status = 'active';

  if not found then
    raise exception 'No active subscription to cancel' using errcode = 'P0002';
  end if;
end;
$$;


-- ---------------------------------------------------------------------
-- watchlist
-- ---------------------------------------------------------------------

create table if not exists public.watchlist (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  tmdb_id integer not null check (tmdb_id > 0),
  media_type text not null check (media_type in ('movie', 'tv')),
  created_at timestamptz not null default now(),
  unique (user_id, tmdb_id, media_type)
);

alter table public.watchlist enable row level security;

drop policy if exists "Users can view their own watchlist" on public.watchlist;
create policy "Users can view their own watchlist"
  on public.watchlist for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can add to their own watchlist" on public.watchlist;
create policy "Users can add to their own watchlist"
  on public.watchlist for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can remove from their own watchlist" on public.watchlist;
create policy "Users can remove from their own watchlist"
  on public.watchlist for delete
  to authenticated
  using ((select auth.uid()) = user_id);

revoke all on table public.watchlist from anon, authenticated;
grant select, insert, delete on table public.watchlist to authenticated;


-- ---------------------------------------------------------------------
-- viewing_status (simulated viewing, Echo+ subscribers only)
-- ---------------------------------------------------------------------

create table if not exists public.viewing_status (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  tmdb_id integer not null check (tmdb_id > 0),
  media_type text not null check (media_type in ('movie', 'tv')),
  status text not null check (status in ('watching', 'completed')),
  season_number integer check (season_number >= 0),
  episode_number integer check (episode_number > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, tmdb_id, media_type),
  check (media_type = 'tv' or (season_number is null and episode_number is null))
);

drop trigger if exists viewing_status_set_updated_at on public.viewing_status;
create trigger viewing_status_set_updated_at
  before update on public.viewing_status
  for each row execute function public.set_updated_at();

alter table public.viewing_status enable row level security;

drop policy if exists "Users can view their own viewing status" on public.viewing_status;
create policy "Users can view their own viewing status"
  on public.viewing_status for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Subscribers can record their own viewing" on public.viewing_status;
create policy "Subscribers can record their own viewing"
  on public.viewing_status for insert
  to authenticated
  with check ((select auth.uid()) = user_id and public.has_active_subscription());

drop policy if exists "Subscribers can update their own viewing" on public.viewing_status;
create policy "Subscribers can update their own viewing"
  on public.viewing_status for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id and public.has_active_subscription());

drop policy if exists "Users can delete their own viewing status" on public.viewing_status;
create policy "Users can delete their own viewing status"
  on public.viewing_status for delete
  to authenticated
  using ((select auth.uid()) = user_id);

revoke all on table public.viewing_status from anon, authenticated;
grant select, insert, update, delete on table public.viewing_status to authenticated;


-- ---------------------------------------------------------------------
-- ratings
-- ---------------------------------------------------------------------

create table if not exists public.ratings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  tmdb_id integer not null check (tmdb_id > 0),
  media_type text not null check (media_type in ('movie', 'tv')),
  rating smallint not null check (rating between 1 and 5),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, tmdb_id, media_type)
);

create index if not exists ratings_title_idx on public.ratings (tmdb_id, media_type);

drop trigger if exists ratings_set_updated_at on public.ratings;
create trigger ratings_set_updated_at
  before update on public.ratings
  for each row execute function public.set_updated_at();

alter table public.ratings enable row level security;

drop policy if exists "Users can view their own ratings" on public.ratings;
create policy "Users can view their own ratings"
  on public.ratings for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can add their own ratings" on public.ratings;
create policy "Users can add their own ratings"
  on public.ratings for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update their own ratings" on public.ratings;
create policy "Users can update their own ratings"
  on public.ratings for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete their own ratings" on public.ratings;
create policy "Users can delete their own ratings"
  on public.ratings for delete
  to authenticated
  using ((select auth.uid()) = user_id);

revoke all on table public.ratings from anon, authenticated;
grant select, insert, update, delete on table public.ratings to authenticated;

-- Exposes only the aggregate, never who rated what.
create or replace function public.get_rating_summary(p_tmdb_id integer, p_media_type text)
returns table (average_rating numeric, rating_count bigint)
language sql
stable
security definer
set search_path = ''
as $$
  select round(avg(rating)::numeric, 1), count(*)
  from public.ratings
  where tmdb_id = p_tmdb_id
    and media_type = p_media_type;
$$;


-- ---------------------------------------------------------------------
-- Account deletion
-- ---------------------------------------------------------------------

-- Deletes the caller's auth user; their rows cascade. Lets the app delete
-- an account without a service role key.
create or replace function public.delete_own_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;

  delete from auth.users where id = v_user_id;
end;
$$;


-- ---------------------------------------------------------------------
-- Function permissions (Supabase grants EXECUTE to everyone by default)
-- ---------------------------------------------------------------------

revoke execute on function public.set_updated_at() from public, anon, authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;

revoke execute on function public.is_admin() from public, anon, authenticated;
grant execute on function public.is_admin() to anon, authenticated;

revoke execute on function public.has_active_subscription() from public, anon, authenticated;
grant execute on function public.has_active_subscription() to authenticated;

revoke execute on function public.start_subscription(uuid) from public, anon, authenticated;
grant execute on function public.start_subscription(uuid) to authenticated;

revoke execute on function public.cancel_subscription() from public, anon, authenticated;
grant execute on function public.cancel_subscription() to authenticated;

revoke execute on function public.get_rating_summary(integer, text) from public, anon, authenticated;
grant execute on function public.get_rating_summary(integer, text) to anon, authenticated;

revoke execute on function public.delete_own_account() from public, anon, authenticated;
grant execute on function public.delete_own_account() to authenticated;


-- ---------------------------------------------------------------------
-- Seed data: Echo+ plans (prices are simulated)
-- ---------------------------------------------------------------------

insert into public.subscription_plans
  (slug, name, description, price_cents, billing_interval, features, sort_order)
values
  (
    'echo-plus-monthly',
    'Echo+ Monthly',
    'Full Echo+ access, billed every month.',
    999,
    'month',
    array['Simulated viewing of all movies and shows', 'Track viewing progress', 'Cancel anytime'],
    1
  ),
  (
    'echo-plus-annual',
    'Echo+ Annual',
    'Full Echo+ access, billed once a year.',
    9999,
    'year',
    array['Simulated viewing of all movies and shows', 'Track viewing progress', 'Two months free compared to monthly'],
    2
  )
on conflict (slug) do nothing;
