# Supabase

SQL migrations for Echo's database go in `supabase/migrations/`. To apply one, paste it into Supabase Dashboard > SQL Editor and run it. Migrations are written to be safe to re-run.

## Schema

`20261005000000_initial_schema.sql` creates:

| Table | Purpose | Who can access |
| --- | --- | --- |
| `profiles` | Name and role for each auth user (created automatically on sign-up) | Owner reads and updates `full_name` only; admins read all |
| `subscription_plans` | Echo+ plans (seeded with Monthly and Annual) | Anyone reads active plans; admins manage |
| `subscriptions` | Simulated Echo+ subscriptions | Owner reads; changes only via functions below |
| `watchlist` | Saved titles | Owner reads, adds, removes |
| `viewing_status` | Simulated viewing progress | Owner reads/deletes; writes require an active Echo+ subscription |
| `ratings` | 1 to 5 rating per title | Owner only; averages via `get_rating_summary` |

Database functions (call with `supabase.rpc(...)`):

- `start_subscription(p_plan_id)` / `cancel_subscription()`: simulated subscribe and cancel; dates are set server-side
- `has_active_subscription()`: whether the current user has Echo+
- `get_rating_summary(p_tmdb_id, p_media_type)`: average rating and count, without exposing who rated
- `delete_own_account()`: deletes the current user and all their data
- `is_admin()`: whether the current user is an admin

To pass a name at sign-up, use `supabase.auth.signUp({ email, password, options: { data: { full_name } } })`.

To make someone an admin, run this in the SQL Editor (users cannot change their own role):

```sql
update public.profiles set role = 'admin' where id = '<user uuid from Authentication > Users>';
```

## Data rules

- Movie and TV metadata stays in TMDB. Echo tables reference content with `tmdb_id` and `media_type` (`'movie'` or `'tv'`) only.
- Auth users live in `auth.users`. Echo tables reference them with `user_id uuid references auth.users (id) on delete cascade`.

## Row Level Security

Every user-owned or private table must enable RLS in the same migration that creates it, with policies scoped to the owner. Only add the operations the feature needs. Never use `using (true)` on private data.

```sql
alter table public.example enable row level security;

create policy "Users can view their own rows"
  on public.example for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can insert their own rows"
  on public.example for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can update their own rows"
  on public.example for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users can delete their own rows"
  on public.example for delete
  to authenticated
  using ((select auth.uid()) = user_id);
```

## Keys

- The publishable key (`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`) is public and relies on RLS.
- The service role / secret key bypasses RLS. It must never be committed, used in client code, or given a `NEXT_PUBLIC_` prefix. Admin features will use separate server-side authorization.
