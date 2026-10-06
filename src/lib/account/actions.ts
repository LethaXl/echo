"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { GENERIC_ERROR_MESSAGE, getAuthErrorMessage, NOT_CONFIGURED_MESSAGE } from "@/lib/auth/errors";
import type { FormState } from "@/lib/auth/form-state";
import { getPassword, getText, validateFullName } from "@/lib/auth/validation";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

// US-07 Update My Name
export async function updateName(_prevState: FormState, formData: FormData): Promise<FormState> {
  const fullName = getText(formData, "fullName");
  const values = { fullName };

  const validationError = validateFullName(fullName);
  if (validationError) return { status: "error", message: validationError, values };
  if (!isSupabaseConfigured()) return { status: "error", message: NOT_CONFIGURED_MESSAGE, values };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data, error } = await supabase
    .from("profiles")
    .update({ full_name: fullName })
    .eq("id", user.id)
    .select("id");

  if (error || !data?.length) {
    if (error) console.error("Failed to update name:", error.message);
    return { status: "error", message: GENERIC_ERROR_MESSAGE, values };
  }

  revalidatePath("/account");
  return { status: "success", message: "Your name has been updated.", values };
}

// US-08 Delete My Account
export async function deleteAccount(_prevState: FormState, formData: FormData): Promise<FormState> {
  const password = getPassword(formData, "password");
  const confirmed = formData.get("confirm") === "on";

  if (!password) return { status: "error", message: "Enter your password to confirm." };
  if (!confirmed) {
    return { status: "error", message: "Confirm that you understand this cannot be undone." };
  }
  if (!isSupabaseConfigured()) return { status: "error", message: NOT_CONFIGURED_MESSAGE };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) redirect("/login");

  const { error: verifyError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password,
  });
  if (verifyError) {
    return {
      status: "error",
      message:
        verifyError.code === "invalid_credentials"
          ? "Your password is incorrect."
          : getAuthErrorMessage(verifyError),
    };
  }

  const { error } = await supabase.rpc("delete_own_account");
  if (error) {
    console.error("Failed to delete account:", error.message);
    return { status: "error", message: GENERIC_ERROR_MESSAGE };
  }

  await supabase.auth.signOut({ scope: "local" });
  revalidatePath("/", "layout");
  redirect("/?accountDeleted=1");
}
