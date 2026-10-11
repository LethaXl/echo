# Supabase

SQL migrations for Echo's database go in `supabase/migrations/`. To apply one, paste it into Supabase Dashboard > SQL Editor and run it. Migrations are written to be safe to re-run.

## Migrations

Run these in order:

1. `20261005000000_initial_schema.sql`: tables, policies, functions and the seeded Echo+ plans (below).
2. `20261010000000_subscription_password_confirmation.sql` (US-24): `start_subscription()` only works on a session that signed in with a password in the last 5 minutes, so the password confirmation in the subscribe dialog can't be skipped by calling the function directly.
3. `20261011000000_subscription_management.sql` (US-26 to US-29): upgrade, switch to monthly, downgrade, cancel, subscribe again, automatic renewal and the `subscription_events` history table. The app needs this one: the account page reads the columns it adds.

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

To make someone an admin, run this in the SQL Editor (users cannot change their own role):

```sql
update public.profiles set role = 'admin' where id = '<user uuid from Authentication > Users>';
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
