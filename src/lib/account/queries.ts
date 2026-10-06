import "server-only";
import type { User } from "@supabase/supabase-js";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

export type ActiveSubscription = {
  planName: string;
  currentPeriodEnd: string;
};

export type AccountDetails = {
  fullName: string | null;
  email: string;
  createdAt: string;
  subscription: ActiveSubscription | null;
};

type ProfileRow = { full_name: string | null };

type SubscriptionRow = {
  current_period_end: string;
  plan: { name: string } | null;
};

export const getProfileName = cache(async (userId: string): Promise<string | null> => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", userId)
    .maybeSingle<ProfileRow>();

  if (error) console.error("Failed to load profile name:", error.message);
  return data?.full_name ?? null;
});

export async function getAccountDetails(user: User): Promise<AccountDetails> {
  const supabase = await createClient();

  const [profileResult, subscriptionResult] = await Promise.all([
    supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle<ProfileRow>(),
    supabase
      .from("subscriptions")
      .select("current_period_end, plan:subscription_plans(name)")
      .eq("user_id", user.id)
      .eq("status", "active")
      .gt("current_period_end", new Date().toISOString())
      .maybeSingle<SubscriptionRow>(),
  ]);

  if (profileResult.error) console.error("Failed to load profile:", profileResult.error.message);
  if (subscriptionResult.error) {
    console.error("Failed to load subscription:", subscriptionResult.error.message);
  }

  const subscription = subscriptionResult.data;

  return {
    fullName: profileResult.data?.full_name ?? null,
    email: user.email ?? "",
    createdAt: user.created_at,
    subscription: subscription
      ? {
          planName: subscription.plan?.name ?? "Echo+",
          currentPeriodEnd: subscription.current_period_end,
        }
      : null,
  };
}
