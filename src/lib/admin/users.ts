import { APP_NAME } from "@/lib/brand";
import { BILLING_PERIODS, type BillingInterval, type ScheduledChange } from "@/lib/subscriptions/plans";

/** Shared by /admin/users and its server code (US-61 to US-65). */

export const USERS_PER_PAGE = 20;
export const MAX_USER_SEARCH_LENGTH = 100;

export const ACCOUNT_STATUS_FILTERS = ["all", "active", "deactivated"] as const;
export type AccountStatusFilter = (typeof ACCOUNT_STATUS_FILTERS)[number];

export function parseStatusFilter(value: string): AccountStatusFilter {
  return (ACCOUNT_STATUS_FILTERS as readonly string[]).includes(value) ? (value as AccountStatusFilter) : "all";
}

export type AdminUser = {
  id: string;
  name: string | null;
  email: string;
  isAdmin: boolean;
  joinedAt: string;
  deactivated: boolean;
  /** The plan giving Echo+ right now; `null` is Free. */
  plan: BillingInterval | null;
};

export type AdminUserPage = { users: AdminUser[]; total: number };

export type AdminSubscription = {
  plan: BillingInterval;
  startedAt: string;
  currentPeriodEnd: string;
  scheduledChange: ScheduledChange | null;
  scheduledPlan: BillingInterval | null;
};

export type AdminUserDetails = AdminUser & {
  deactivatedAt: string | null;
  /** The subscription giving Echo+ right now; `null` for Free accounts. */
  subscription: AdminSubscription | null;
};

export function planLabel(plan: BillingInterval | null): string {
  return plan ? `${APP_NAME}+ ${BILLING_PERIODS[plan].label}` : "Free";
}

export const displayName = (user: Pick<AdminUser, "name">) => user.name?.trim() || "No name";

/** /admin/users with only the settings that differ from the defaults. */
export function usersHref({
  query = "",
  status = "all",
  page = 1,
}: { query?: string; status?: AccountStatusFilter; page?: number } = {}) {
  const search = new URLSearchParams();
  if (query) search.set("q", query);
  if (status !== "all") search.set("status", status);
  if (page > 1) search.set("page", String(page));
  const text = search.toString();
  return text ? `/admin/users?${text}` : "/admin/users";
}
