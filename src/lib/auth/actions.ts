"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import { getAuthErrorField, getAuthErrorMessage, NOT_CONFIGURED_MESSAGE } from "./errors";
import type { FormState } from "./form-state";
import {
  clearRecoveryCookie,
  hasRecoveryCookie,
  RESET_PASSWORD_PATH,
} from "./recovery";
import { safeNextPath } from "./redirect";
import { getCurrentUser } from "./session";
import {
  getPassword,
  getText,
  validateEmailForm,
  validateLogInForm,
  validateNewPassword,
  validateNewPasswordForm,
  validateSignUpForm,
  type FieldError,
} from "./validation";

async function getOrigin(): Promise<string> {
  const headerList = await headers();
  return headerList.get("origin") ?? `https://${headerList.get("host")}`;
}

function errorState(
  message: string,
  values?: Record<string, string>,
  field?: string,
): FormState {
  return { status: "error", message, values, field };
}

function fieldErrorState(error: FieldError, values?: Record<string, string>): FormState {
  return errorState(error.message, values, error.field);
}

// US-01 Create an Account
export async function signUp(_prevState: FormState, formData: FormData): Promise<FormState> {
  const fullName = getText(formData, "fullName");
  const email = getText(formData, "email").toLowerCase();
  const password = getPassword(formData, "password");
  const values = { fullName, email };

  const validationError = validateSignUpForm(formData);
  if (validationError) return fieldErrorState(validationError, values);
  if (!isSupabaseConfigured()) return errorState(NOT_CONFIGURED_MESSAGE, values);

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName },
      emailRedirectTo: `${await getOrigin()}/auth/confirm?next=/account`,
    },
  });

  if (error) return errorState(getAuthErrorMessage(error), values, getAuthErrorField(error));

  if (data.session) {
    revalidatePath("/", "layout");
    redirect("/");
  }

  return {
    status: "success",
    message: `We sent a confirmation link to ${email}. Open it to activate your account, then log in.`,
    values: { email },
  };
}

// US-02 Log In
export async function logIn(_prevState: FormState, formData: FormData): Promise<FormState> {
  const email = getText(formData, "email").toLowerCase();
  const password = getPassword(formData, "password");
  const values = { email };

  const validationError = validateLogInForm(formData);
  if (validationError) return fieldErrorState(validationError, values);
  if (!isSupabaseConfigured()) return errorState(NOT_CONFIGURED_MESSAGE, values);

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) return errorState(getAuthErrorMessage(error), values);

  revalidatePath("/", "layout");
  redirect(safeNextPath(formData.get("next")) ?? "/");
}

// US-03 Log Out
export async function logOut(): Promise<void> {
  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    await supabase.auth.signOut();
  }

  revalidatePath("/", "layout");
  redirect("/");
}

// US-04 Reset a Forgotten Password (step 1: request the email)
export async function requestPasswordReset(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const email = getText(formData, "email").toLowerCase();
  const values = { email };

  const validationError = validateEmailForm(formData);
  if (validationError) return fieldErrorState(validationError, values);
  if (!isSupabaseConfigured()) return errorState(NOT_CONFIGURED_MESSAGE, values);

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${await getOrigin()}/auth/confirm?next=${RESET_PASSWORD_PATH}`,
  });

  // Only rate limits are surfaced, so the response never reveals whether an account exists.
  if (error?.code === "over_email_send_rate_limit" || error?.code === "over_request_rate_limit") {
    return errorState(getAuthErrorMessage(error), values);
  }

  return {
    status: "success",
    message: `If an account exists for ${email}, we sent a link to reset your password.`,
    values,
  };
}

// US-04 Reset a Forgotten Password (step 2: choose a new password)
export async function resetPassword(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const password = getPassword(formData, "password");

  const validationError = validateNewPasswordForm(formData);
  if (validationError) return fieldErrorState(validationError);
  if (!isSupabaseConfigured()) return errorState(NOT_CONFIGURED_MESSAGE);

  const supabase = await createClient();
  const user = await getCurrentUser();

  if (!user || !(await hasRecoveryCookie())) {
    return errorState("Your reset link has expired. Please request a new one.");
  }

  const { error } = await supabase.auth.updateUser({ password });
  if (error) return errorState(getAuthErrorMessage(error), undefined, getAuthErrorField(error));

  await clearRecoveryCookie();
  revalidatePath("/", "layout");

  return { status: "success", message: "Your password has been reset." };
}

// US-05 Change My Password
export async function changePassword(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const currentPassword = getPassword(formData, "currentPassword");
  const newPassword = getPassword(formData, "newPassword");
  const confirmPassword = getPassword(formData, "confirmPassword");

  if (!currentPassword) return errorState("Enter your current password.");
  const validationError = validateNewPassword(newPassword, confirmPassword);
  if (validationError) return errorState(validationError);
  if (!isSupabaseConfigured()) return errorState(NOT_CONFIGURED_MESSAGE);

  const supabase = await createClient();
  const user = await getCurrentUser();

  if (!user?.email) redirect("/login");

  const { error: verifyError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: currentPassword,
  });
  if (verifyError) {
    return errorState(
      verifyError.code === "invalid_credentials"
        ? "Your current password is incorrect."
        : getAuthErrorMessage(verifyError),
    );
  }

  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) return errorState(getAuthErrorMessage(error));

  return { status: "success", message: "Your password has been changed." };
}
