import "server-only";
import type { User } from "@supabase/supabase-js";
import { cache } from "react";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

/** Errors meaning the user management migration hasn't been applied yet, so nobody is deactivated. */
const MISSING_FUNCTION_CODES = new Set(["PGRST202", "42883"]);

type Session = { user: User; deactivated: boolean } | null;

/**
 * The signed-in user and whether an admin has deactivated their account (US-64). The database
 * refuses every write from a deactivated account and hides its rows, so if the status can't be
 * checked the account is treated as active here rather than showing a false deactivation screen.
 */
const getSession = cache(async (): Promise<Session> => {
  if (!isSupabaseConfigured()) {
    return null;
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase.rpc("is_account_active");
  if (error && !MISSING_FUNCTION_CODES.has(error.code)) {
    console.error("Failed to check account status:", error.message);
  }
  return { user, deactivated: !error && data === false };
});

/** The signed-in user, or `null` for visitors and deactivated accounts, which can't use Echo. */
export const getCurrentUser = cache(async (): Promise<User | null> => {
  const session = await getSession();
  return session && !session.deactivated ? session.user : null;
});

/** Whether someone is signed in to an account that has been deactivated. */
export async function isCurrentAccountDeactivated(): Promise<boolean> {
  return (await getSession())?.deactivated === true;
}
