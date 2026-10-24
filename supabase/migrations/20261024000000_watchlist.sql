-- Sprint 3 Part 1 (US-36–US-40). Reuse the existing watchlist; no parallel table.
-- Safe to apply after the initial schema; preserves existing saved titles.

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

create index if not exists watchlist_user_added_idx
  on public.watchlist (user_id, created_at desc, id);
