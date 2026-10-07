import "server-only";
import type { User } from "@supabase/supabase-js";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { getActiveSubscription, type ActiveSubscription } from "@/lib/subscriptions/queries";

export type AccountDetails = {
  fullName: string | null;
  email: string;
  createdAt: string;
  subscription: ActiveSubscription | null;
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

  const [profileResult, subscription] = await Promise.all([
    supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle<ProfileRow>(),
    getActiveSubscription(user.id),
  ]);

  if (profileResult.error) console.error("Failed to load profile:", profileResult.error.message);

  return {
    fullName: profileResult.data?.full_name ?? null,
    email: user.email ?? "",
    createdAt: user.created_at,
    subscription,
  };
}
