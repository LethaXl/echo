-- Apply after 20261024000000_watchlist.sql and subscription management.
-- A restrictive policy ANDs with the existing owner-only policies. Keeping
-- this separate also prevents re-running an older migration from reopening access.
-- No rows are deleted: losing Echo+ access only hides the existing collection.
begin;

alter table public.watchlist enable row level security;

drop policy if exists "Watchlist requires Echo+" on public.watchlist;
create policy "Watchlist requires Echo+"
  on public.watchlist as restrictive for all
  to authenticated
  using ((select public.has_active_subscription()))
  with check ((select public.has_active_subscription()));

commit;
