-- US-41 through US-44. Reuse the initial schema's viewing_status table.
-- Stored values remain 'watching' and 'completed'.
-- Existing unique constraint, update trigger, timestamps and ownership policies remain.
begin;

alter table public.viewing_status enable row level security;

-- Restrictive policies AND with the existing owner-only policies for every operation.
-- Subscription expiry hides records without deleting them; resubscribing restores access.
drop policy if exists "Viewing status requires Echo+" on public.viewing_status;
create policy "Viewing status requires Echo+"
  on public.viewing_status as restrictive for all
  to authenticated
  using ((select public.has_active_subscription()))
  with check ((select public.has_active_subscription()));

create index if not exists viewing_status_user_updated_idx
  on public.viewing_status (user_id, updated_at desc, id);

commit;
