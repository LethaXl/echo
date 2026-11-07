# Supabase

SQL migrations for Echo's database go in `supabase/migrations/`. To apply one, paste it into Supabase Dashboard > SQL Editor and run it. Migrations are written to be safe to re-run.

## Migrations

Run these in order:

1. `20261005000000_initial_schema.sql`: tables, policies, functions and the seeded Echo+ plans (below).
2. `20261010000000_subscription_password_confirmation.sql` (US-24): `start_subscription()` only works on a session that signed in with a password in the last 5 minutes, so the password confirmation in the subscribe dialog can't be skipped by calling the function directly.
3. `20261011000000_subscription_management.sql` (US-26 to US-29): upgrade, switch to monthly, downgrade, cancel, subscribe again, automatic renewal and the `subscription_events` history table. The app needs this one: the account page reads the columns it adds.
4. `20261024000000_watchlist.sql` (US-36 to US-40): ensures the existing `watchlist` table and owner-only policies exist, and adds an index for each user's date-ordered collection in Cave. It preserves existing entries and does not create a second watchlist table.
5. `20261024010000_watchlist_echo_plus.sql`: requires Echo+ for all watchlist reads, additions and removals, in addition to ownership. Uses the existing `has_active_subscription()` entitlement rules; no subscription tables or functions are changed and no saved titles are deleted.
6. `20261024020000_viewing_status_echo_plus.sql` (US-41–US-44): requires Echo+ for all viewing-status operations, including reads and clears, and indexes each user's recently updated activity. Reuses the existing table, uniqueness constraint, timestamps and update trigger.
7. `20261024030000_echo_wave_ratings.sql` (US-45–US-48): requires Echo+ for every ratings operation, alongside existing ownership policies, and indexes the user's recently rated titles. Reuses the initial `ratings` table, 1–5 range constraint, unique key, timestamps and update trigger. Existing ratings are preserved.

### Apply Echo Wave Ratings (Sprint 3 Part 3)

After the earlier migrations, paste the entire contents of `supabase/migrations/20261024030000_echo_wave_ratings.sql` into **Supabase Dashboard > SQL Editor > New query** and select **Run**. This migration has **not** been applied automatically. No new credentials, environment variables or subscription setup are needed.

Personal ratings remain integers from 1 to 5 in `ratings.rating`. TMDB's public rating fields are unchanged. Updating a rating uses the same user/movie-or-TV/TMDB-ID record; clearing deletes only that rating. Echo+ expiry hides personal ratings without deleting them. Recently/oldest rated sorting uses `updated_at`, so changing a rating counts as new rating activity. The existing public aggregate function still exposes only averages/counts, never individual ratings or owners.

Manually verify:

- Rate a movie and a TV show, update the score, clear it, then refresh and log out/in. Movies and shows with the same TMDB ID must retain separate ratings. Watchlist and Viewing Status must remain unchanged.
- In **Cave > My Ratings**, check personal wave scores, title search, all six sorts, empty/no-match states and editing/clearing from cards. A missing TMDB title must leave its rating clearable.
- Hover to preview; use Tab and arrow keys (Home/End also work) to move between levels, then Enter or Space to save. Check visible focus and reduced-motion behavior. A failed write must leave the saved score unchanged and display an error.
- Check Monthly/Annual access, cancellation through the paid period, expiry, resubscription restoring ratings, Free-user upgrade prompts and guest login redirects.
- With publishable-key clients authenticated as two different users, verify each can only read/change their own ratings. Free users must not read/write/delete personal ratings; invalid IDs, media types and out-of-range ratings must be rejected. Use authenticated clients for RLS checks: SQL Editor's privileged role bypasses these policies.

### Apply Viewing Status (Sprint 3 Part 2)

After the migrations above, paste `supabase/migrations/20261024020000_viewing_status_echo_plus.sql` into **Supabase Dashboard > SQL Editor > New query** and select **Run**. It has not been applied automatically. No new environment variables or subscription setup are needed.

The UI's **Watched** label maps to the existing database value `completed`; **Watching** maps to `watching`. Clear status deletes only that user's `viewing_status` row, leaving Watchlist untouched. Opening or finishing the simulated viewer does not write a status. Rows remain stored after Echo+ expiry and become accessible again on resubscription. Existing TV episode/season fields are preserved when updating a title's status.

Manually verify movie and TV status changes on detail pages and Viewing Activity cards; the Viewing Status tab's All/Watching/Watched counts and search; direct Watched marking; clear without changing Watchlist; refresh/relogin persistence; Free/expired-account denial and two-account isolation. Using authenticated clients with the publishable key, also verify RLS denies Free users' reads/writes/clears and rejects another user's IDs. SQL Editor's privileged role bypasses these policies and is not a valid isolation test.

### Apply the Sprint 3 Watchlist migration

The migration file is supplied with the app; it has **not** been applied to your live database.
After applying the earlier migrations, open **Supabase Dashboard > SQL Editor > New query**, paste the entire contents of `supabase/migrations/20261024000000_watchlist.sql`, and select **Run**. Then run `supabase/migrations/20261024010000_watchlist_echo_plus.sql` the same way. Both are safe to re-run. The new Echo+ policy must be applied for database-level enforcement; application checks alone do not protect direct Supabase requests. No service-role key or subscription changes are required.

Watchlist entries store only a UUID, authenticated user ID, TMDB ID, media type and creation timestamp. Current poster/title/year metadata comes from TMDB using the existing public-metadata cache; private watchlist queries are request-specific and never placed in that cache. Search and sorting run only over the current user's loaded entries. Missing or temporarily unavailable TMDB metadata leaves a removable placeholder rather than hiding the saved entry.

After applying, verify manually:

- As an Echo Free user, verify Cave shows the Echo+ upgrade state and detail pages offer plans rather than save/remove actions. Direct watchlist reads must return no rows, inserts must fail RLS, and deletes must affect no rows. Repeat while signed out: Cave must invite sign-in.
- With Monthly or Annual Echo+, add a movie and TV show. Repeat the addition or click rapidly: each should appear once, with its original added date. Cancel: access continues until the paid period ends, then the collection becomes inaccessible. Resubscribe: saved entries must reappear. Expired and legacy immediately-cancelled subscriptions must not grant access; automatic renewals follow the existing subscription rules.
- Open **Cave** in the navigation. Check posters, title/year/type, detail links, partial and case-insensitive search, clear search, and all six sorts together with search. Empty lists and searches with no matches have different messages; unknown years sort last.
- Remove entries in Cave and on detail pages; navigate back, refresh, then log out and back in to verify persistence and saved state.
- Use a second account: the first account's collection must not appear. Log out: Cave must invite sign-in and detail pages must offer login to save.
- In a client authenticated as Echo+ user B (using the publishable key, never SQL Editor's privileged role), try selecting/deleting a known row owned by user A and inserting a row with A's `user_id`. Reads/deletes must affect no A rows; insertion must fail RLS. Updates must be denied. Anonymous clients must not read or write any rows. Run these checks against your Supabase project after applying the migrations.
- Simulate a failed database request: adding/removing must show an error without claiming success or hiding the item. A failed list load must show retry rather than an empty collection. A TMDB outage or deleted title must leave its entry removable.
- Account deletion must cascade to its watchlist entries (test with a disposable account).

Run `npm run lint`, `npx tsc --noEmit` and `npm run build` for local checks.

## Schema

`20261005000000_initial_schema.sql` creates:

| Table | Purpose | Who can access |
| --- | --- | --- |
| `profiles` | Name and role for each auth user (created automatically on sign-up) | Owner reads and updates `full_name` only; admins read all |
| `subscription_plans` | Echo+ plans (seeded with Monthly and Annual) | Anyone reads active plans; admins manage |
| `subscriptions` | Simulated Echo+ subscriptions | Owner reads; changes only via functions below |
| `watchlist` | Saved titles | Echo+ owner reads, adds, removes (after `20261024010000_watchlist_echo_plus.sql`) |
| `viewing_status` | Watching / Watched titles | Echo+ owner only after `20261024020000_viewing_status_echo_plus.sql` |
| `ratings` | Personal 1–5 Echo Wave rating per title | Echo+ owner only after `20261024030000_echo_wave_ratings.sql`; public aggregates via `get_rating_summary` |

Database functions (call with `supabase.rpc(...)`):

- `start_subscription(p_plan_id)`: simulated subscribe (or subscribe again); dates are set server-side
- `upgrade_subscription(p_plan_id)`: monthly to annual, effective immediately
- `switch_subscription_plan(p_plan_id)`: annual to monthly, from the next renewal
- `cancel_subscription()` / `downgrade_subscription()`: turn off renewal; Echo+ ends when the current period does (the app only offers cancel)
- `resume_subscription()`: undo a pending switch, cancellation or downgrade
- `sync_my_subscription()`: apply any renewal or expiry that's due on the current user's subscription
- `has_active_subscription()`: whether the current user has Echo+
- `get_rating_summary(p_tmdb_id, p_media_type)`: average rating and count, without exposing who rated
- `delete_own_account()`: deletes the current user and all their data
- `is_admin()`: whether the current user is an admin

To pass a name at sign-up, use `supabase.auth.signUp({ email, password, options: { data: { full_name } } })`.

### Admins (US-49)

`profiles.role` is `user` for everyone by default. Setting it to `admin` shows **Admin Panel** in the account menu and opens `/admin`; both are checked on the server through `is_admin()` on every request, so a change applies on the user's next page load. Users can't change roles: only `full_name` is granted for update, and `20261107000000_admin_role_guard.sql` refuses any role change made through the API. Run that migration in the SQL Editor once (safe to re-run).

To grant admin access:

1. **Authentication > Users**: find the user and copy their **User UID**.
2. **Table Editor > profiles**: find the row whose `id` is that UID (filter on `id` if needed).
3. Double-click the `role` cell, change `user` to `admin`, and save.

To remove it, set the same `role` cell back to `user`. Or in the SQL Editor:

```sql
update public.profiles set role = 'admin' where id = '<User UID>';  -- grant
update public.profiles set role = 'user'  where id = '<User UID>';  -- remove
```

## Subscriptions

- Echo Free is the default: a user is on Free whenever they have no active row in `subscriptions`. There is no Free row, so there's one source of truth.
- Each row is one continuous Echo+ subscription: `plan_id` gives the current plan (monthly or annual) and price, `status` is `active` or `expired` (`cancelled` only appears on rows cancelled before US-28, which ended immediately), `started_at` is when it began, and `current_period_end` is the next renewal date. `scheduled_change` is `null` when it renews as it is, `cancel` / `downgrade` when it ends at `current_period_end`, or `switch_plan` when it renews on `scheduled_plan_id` instead. Cancelling replaces a pending switch. Ended rows are kept, so subscribing again creates a new row.
- Echo+ access: an active row whose period hasn't ended, or that renews automatically. Cancelling or downgrading keeps Echo+ until the period ends, then the member is back on Free.
- `subscriptions_one_active_per_user` allows only one active subscription per user, so duplicates are impossible even with simultaneous requests. Repeated switch, cancel, downgrade or resume requests are refused.
- Subscribing and upgrading need a password sign-in from the last 5 minutes (the app confirms the password on a separate session first). Switching to monthly doesn't, since nothing is charged until the next renewal. Every function acts only on the caller's own subscription (`auth.uid()`); there are no insert, update or delete grants on `subscriptions` or `subscription_events`.
- `subscription_events` records every change (`subscribed`, `resubscribed`, `upgraded`, `renewed`, `cancellation_scheduled`, `downgrade_scheduled`, `reactivated`, `switch_scheduled`, `switch_cancelled`, `switched`, `ended`) with the plan, any simulated charge and the period end, for the subscription history in US-31. Members read their own events; admins read all, so the app's history query (`getSubscriptionHistory()`) also filters by the signed-in user. Only database functions write events, so the history reflects real changes.
- The app reads Echo+ access through `hasEchoPlus()` in `src/lib/subscriptions/queries.ts`, which applies the same rule as `has_active_subscription()`.

### Renewals

Payments are simulated, so renewals always succeed. When a period ends, `settle_subscription()` advances it by one calendar month or year (counted from the plan's start, so Jan 31 renews on Feb 28, then Mar 31) and records one `renewed` event per period. If a cancellation or downgrade was scheduled, it marks the subscription `expired` instead. If a switch was scheduled, it moves to the new plan (a `switched` event) and renews on it from that date. A unique index allows only one renewal per period, so running it again changes nothing.

This runs automatically, without a scheduled job, whenever a member opens a page that checks their plan (`sync_my_subscription()`), and inside every subscription function. Access never depends on it having run.

To also keep everyone's dates and history current (for example, for admin reports), schedule the batch function. Enable **Integrations > Cron** (`pg_cron`) in the Supabase Dashboard, then run once in the SQL Editor:

```sql
select cron.schedule(
  'echo-subscription-renewals',
  '0 * * * *', -- hourly
  $$select public.process_subscription_renewals()$$
);
```

`process_subscription_renewals()` can't be called by app users. Remove the job with `select cron.unschedule('echo-subscription-renewals');`.

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
