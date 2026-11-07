"use server";

import type { PostgrestError } from "@supabase/supabase-js";
import { GENERIC_ERROR_MESSAGE, NOT_CONFIGURED_MESSAGE } from "@/lib/auth/errors";
import type { FormState } from "@/lib/auth/form-state";
import { getText } from "@/lib/auth/validation";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import { isCurrentUserAdmin } from "./access";
import { getUserDetails } from "./user-queries";
import { displayName, type AdminUserDetails } from "./users";

/**
 * Admin actions for /admin/users (US-63 to US-65). The database functions check is_admin() and
 * refuse to deactivate admin accounts themselves, so nothing sent by the browser is trusted;
 * the checks here are for clear messages.
 */

export type UserActionState = FormState & { user?: AdminUserDetails };

const NOT_ALLOWED_MESSAGE = "You don't have permission to manage user accounts.";
const NOT_FOUND_MESSAGE = "This account no longer exists.";
const ADMIN_PROTECTED_MESSAGE = "Administrator accounts can't be deactivated.";
const NOT_SET_UP_MESSAGE = "User management isn't set up yet. Apply the user management migration in Supabase.";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function errorMessage(error: PostgrestError | null, action: string): string {
  if (error?.code === "42501") return NOT_ALLOWED_MESSAGE;
  if (error?.code === "P0002") return NOT_FOUND_MESSAGE;
  if (error?.code === "EU001") return ADMIN_PROTECTED_MESSAGE;
  if (error?.code === "PGRST202" || error?.code === "42883") return NOT_SET_UP_MESSAGE;
  console.error(`Failed to ${action}:`, error?.code, error?.message);
  return GENERIC_ERROR_MESSAGE;
}

async function adminCheck(userId: string): Promise<string | null> {
  if (!isSupabaseConfigured()) return NOT_CONFIGURED_MESSAGE;
  if (!(await isCurrentUserAdmin())) return NOT_ALLOWED_MESSAGE;
  if (!UUID.test(userId)) return NOT_FOUND_MESSAGE;
  return null;
}

// US-63 View User Account Details
export async function loadUserDetails(
  userId: string,
): Promise<{ ok: true; user: AdminUserDetails } | { ok: false; message: string }> {
  const problem = await adminCheck(String(userId));
  if (problem) return { ok: false, message: problem };

  const result = await getUserDetails(userId);
  return result.ok ? result : { ok: false, message: errorMessage(result.error, "load user details") };
}

// US-64 Deactivate a User Account, US-65 Reactivate a User Account
export async function setUserActive(_prev: UserActionState, formData: FormData): Promise<UserActionState> {
  const userId = getText(formData, "userId");
  const active = getText(formData, "active");
  const problem = await adminCheck(userId);
  if (problem) return { status: "error", message: problem };
  if (active !== "true" && active !== "false") return { status: "error", message: GENERIC_ERROR_MESSAGE };

  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_set_user_active", {
    p_user_id: userId,
    p_active: active === "true",
  });
  if (error) {
    return { status: "error", message: errorMessage(error, active === "true" ? "reactivate user" : "deactivate user") };
  }

  // The change is saved; if the fresh details can't be read, the dialog keeps what it showed.
  const details = await getUserDetails(userId);
  const user = details.ok ? details.user : undefined;
  const name = user ? displayName(user) : "The account";
  return {
    status: "success",
    user,
    message:
      active === "true"
        ? `Account reactivated. ${name} can use Echo again.`
        : `Account deactivated. ${name} can no longer access Echo.`,
  };
}
