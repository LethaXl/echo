import "server-only";
import type { User } from "@supabase/supabase-js";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { toBillingOptions, type BillingOption } from "@/lib/subscriptions/plans";
import {
  getPastSubscription,
  getSubscriptionHistory,
  getSubscriptionPlans,
  lookUpSubscription,
  type PastSubscription,
  type SubscriptionHistory,
  type SubscriptionLookup,
} from "@/lib/subscriptions/queries";

export type AccountDetails = {
  fullName: string | null;
  email: string;
  createdAt: string;
  subscription: SubscriptionLookup;
  /** The most recent subscription that ended, when the member is on the free plan. */
  pastSubscription: PastSubscription | null;
  /** Echo+ plans for upgrading or subscribing again; empty if they couldn't be loaded. */
  billingOptions: BillingOption[];
  history: SubscriptionHistory;
};

type ProfileRow = { full_name: string | null };

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

  const [profileResult, subscription, plans] = await Promise.all([
    supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle<ProfileRow>(),
    lookUpSubscription(user.id),
    getSubscriptionPlans(),
  ]);

  if (profileResult.error) console.error("Failed to load profile:", profileResult.error.message);

  const onFreePlan = subscription.ok && !subscription.subscription;
  // After the lookup, which records any renewal or expiry that was due.
  const [pastSubscription, history] = await Promise.all([
    onFreePlan ? getPastSubscription(user.id) : null,
    getSubscriptionHistory(user.id),
  ]);

  return {
    fullName: profileResult.data?.full_name ?? null,
    email: user.email ?? "",
    createdAt: user.created_at,
    subscription,
    pastSubscription,
    billingOptions: plans ? toBillingOptions(plans) : [],
    history,
  };
}
