import "server-only";
import { cache } from "react";
import { getCurrentUser } from "@/lib/auth/session";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export type BillingInterval = "month" | "year";

export type SubscriptionPlan = {
  id: string;
  name: string;
  description: string | null;
  priceCents: number;
  billingInterval: BillingInterval;
};

export type ActiveSubscription = {
  planId: string;
  planName: string;
  currentPeriodEnd: string;
};

type PlanRow = {
  id: string;
  name: string;
  description: string | null;
  price_cents: number;
  billing_interval: BillingInterval;
};

type SubscriptionRow = {
  plan_id: string;
  current_period_end: string;
  plan: { name: string } | null;
};

/** Active plans in display order, or `null` if they couldn't be loaded. Plans are public under RLS. */
export const getSubscriptionPlans = cache(async (): Promise<SubscriptionPlan[] | null> => {
  if (!isSupabaseConfigured()) return null;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("subscription_plans")
    .select("id, name, description, price_cents, billing_interval")
    .eq("is_active", true)
    .order("sort_order")
    .overrideTypes<PlanRow[], { merge: false }>();

  if (error) {
    console.error("Failed to load subscription plans:", error.message);
    return null;
  }

  return data.map((plan) => ({
    id: plan.id,
    name: plan.name,
    description: plan.description,
    priceCents: plan.price_cents,
    billingInterval: plan.billing_interval,
  }));
});

/** Same rule as the database's has_active_subscription(): active and not past its period end. */
export const getActiveSubscription = cache(
  async (userId: string): Promise<ActiveSubscription | null> => {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("subscriptions")
      .select("plan_id, current_period_end, plan:subscription_plans(name)")
      .eq("user_id", userId)
      .eq("status", "active")
      .gt("current_period_end", new Date().toISOString())
      .maybeSingle<SubscriptionRow>();

    if (error) {
      console.error("Failed to load subscription:", error.message);
      return null;
    }

    return data
      ? {
          planId: data.plan_id,
          planName: data.plan?.name ?? "Echo+",
          currentPeriodEnd: data.current_period_end,
        }
      : null;
  },
);

/** The signed-in user's active Echo+ subscription; always `null` for visitors. */
export async function getCurrentSubscription(): Promise<ActiveSubscription | null> {
  const user = await getCurrentUser();
  return user ? getActiveSubscription(user.id) : null;
}
