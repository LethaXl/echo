-- US-45 through US-48: reuse ratings, its 1-5 constraint, unique title key,
-- timestamps and update trigger from the initial schema. No rating data is removed.
begin;

alter table public.ratings enable row level security;

-- AND with the existing owner-only policies for every operation.
drop policy if exists "Ratings require Echo+" on public.ratings;
create policy "Ratings require Echo+"
  on public.ratings as restrictive for all
  to authenticated
  using ((select public.has_active_subscription()))
  with check ((select public.has_active_subscription()));

create index if not exists ratings_user_updated_idx
  on public.ratings (user_id, updated_at desc, id);

commit;
