-- US-49 Access the Admin Dashboard
--
-- Admin access comes from public.profiles.role ('user' by default, or 'admin'),
-- checked on the server through public.is_admin(). Roles are only assigned or
-- removed by the project owner in the Supabase Dashboard (Table Editor or SQL
-- Editor); the app has no way to change them.
--
-- The column grants in the initial schema already stop signed-in users from
-- updating role. This trigger also refuses any role change made through the
-- API roles (anon, authenticated), so a broader grant or policy added later
-- can't let a user promote themselves. Dashboard edits run as a privileged
-- database role and are unaffected.
--
-- Safe to re-run. Does not change any existing roles.

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

  return new;
end;
$$;

drop trigger if exists profiles_protect_role on public.profiles;
create trigger profiles_protect_role
  before insert or update on public.profiles
  for each row execute function public.protect_profile_role();

revoke execute on function public.protect_profile_role() from public, anon, authenticated;

comment on column public.profiles.role is
  'user (default) or admin. Set to admin in the Supabase Dashboard to grant the Admin Panel; set back to user to revoke it.';
