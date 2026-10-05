# Supabase

SQL migrations for Echo's database go in `supabase/migrations/`. No tables have been created yet; each table is added by the user story that needs it.

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
