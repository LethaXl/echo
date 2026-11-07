import "server-only";
import type { PostgrestError } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import type { BillingInterval, ScheduledChange } from "@/lib/subscriptions/plans";
import { isCurrentUserAdmin } from "./access";
import {
  USERS_PER_PAGE,
  type AccountStatusFilter,
  type AdminSubscription,
  type AdminUser,
  type AdminUserDetails,
  type AdminUserPage,
} from "./users";

/**
 * Reads for /admin/users. Emails live in Supabase Auth, so they come from admin-only database
 * functions (admin_list_users, admin_get_user) that check is_admin() themselves and run with the
 * admin's own session; no service role key is involved.
 */

type UserRow = {
  id: string;
  full_name: string | null;
  email: string | null;
  role: string;
  created_at: string;
  deactivated_at: string | null;
  billing_interval?: string | null;
};

type SubscriptionRow = {
  billing_interval: string | null;
  started_at: string;
  current_period_end: string;
  scheduled_change: string | null;
  scheduled_billing_interval: string | null;
};

const interval = (value: string | null | undefined): BillingInterval | null =>
  value === "month" || value === "year" ? value : null;

const scheduledChange = (value: string | null): ScheduledChange | null =>
  value === "cancel" || value === "downgrade" || value === "switch_plan" ? value : null;

function toUser(row: UserRow): AdminUser {
  return {
    id: row.id,
    name: row.full_name,
    email: row.email ?? "",
    isAdmin: row.role === "admin",
    joinedAt: row.created_at,
    deactivated: row.deactivated_at !== null,
    plan: interval(row.billing_interval),
  };
}

function toSubscription(row: SubscriptionRow | null): AdminSubscription | null {
  const plan = interval(row?.billing_interval);
  if (!row || !plan) return null;
  return {
    plan,
    startedAt: row.started_at,
    currentPeriodEnd: row.current_period_end,
    scheduledChange: scheduledChange(row.scheduled_change),
    scheduledPlan: interval(row.scheduled_billing_interval),
  };
}

/** One page of accounts, newest first; `null` if they couldn't be loaded. */
export async function listUsers({
  query,
  status,
  page,
}: {
  query: string;
  status: AccountStatusFilter;
  page: number;
}): Promise<AdminUserPage | null> {
  if (!(await isCurrentUserAdmin())) return null;

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_list_users", {
    p_search: query || null,
    p_status: status,
    p_limit: USERS_PER_PAGE,
    p_offset: (page - 1) * USERS_PER_PAGE,
  });
  if (error) {
    console.error("Failed to list users:", error.code, error.message);
    return null;
  }

  const result = data as { total: number; users: UserRow[] } | null;
  if (!result || !Array.isArray(result.users)) return null;
  return { total: Number(result.total) || 0, users: result.users.map(toUser) };
}

export type UserDetailsResult =
  | { ok: true; user: AdminUserDetails }
  | { ok: false; error: PostgrestError | null };

export async function getUserDetails(userId: string): Promise<UserDetailsResult> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_get_user", { p_user_id: userId });
  if (error || !data) return { ok: false, error };

  const row = data as UserRow & { subscription: SubscriptionRow | null };
  const user = toUser(row);
  const subscription = toSubscription(row.subscription);
  return {
    ok: true,
    user: { ...user, plan: subscription?.plan ?? null, deactivatedAt: row.deactivated_at, subscription },
  };
}
