import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { BillingInterval } from "@/lib/subscriptions/plans";
import { isCurrentUserAdmin } from "./access";

export type SubscriptionStats = {
  totalUsers: number;
  freeUsers: number;
  monthly: number;
  annual: number;
  echoPlus: number;
};

/**
 * Counts for /admin/subscriptions, made with the admin's own session: RLS lets admins read every
 * profile and subscription. Only counts leave the database, never rows. `null` on any error.
 */
export async function getSubscriptionStats(): Promise<SubscriptionStats | null> {
  if (!(await isCurrentUserAdmin())) return null;

  const supabase = await createClient();
  const now = new Date().toISOString();

  // Same rule as has_active_subscription(): an active row whose period hasn't ended, or that
  // renews (no change scheduled, or a switch). One active row per user, so each counts once.
  const countActive = (interval: BillingInterval) =>
    supabase
      .from("subscriptions")
      .select("id, plan:subscription_plans!plan_id!inner(billing_interval)", {
        count: "exact",
        head: true,
      })
      .eq("status", "active")
      .eq("plan.billing_interval", interval)
      .or(`current_period_end.gt."${now}",scheduled_change.is.null,scheduled_change.eq.switch_plan`);

  // Every account has a profile, created when it signs up.
  const [users, monthly, annual] = await Promise.all([
    supabase.from("profiles").select("id", { count: "exact", head: true }),
    countActive("month"),
    countActive("year"),
  ]);

  const error = users.error ?? monthly.error ?? annual.error;
  if (error || users.count === null || monthly.count === null || annual.count === null) {
    console.error("Failed to load subscription statistics:", error?.message);
    return null;
  }

  const echoPlus = monthly.count + annual.count;
  return {
    totalUsers: users.count,
    freeUsers: Math.max(0, users.count - echoPlus),
    monthly: monthly.count,
    annual: annual.count,
    echoPlus,
  };
}
