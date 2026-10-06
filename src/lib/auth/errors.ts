import type { AuthError } from "@supabase/supabase-js";

export const GENERIC_ERROR_MESSAGE = "Something went wrong. Please try again.";
export const NOT_CONFIGURED_MESSAGE =
  "Accounts are unavailable because Supabase is not configured.";

export function getAuthErrorField(error: AuthError): string | undefined {
  switch (error.code) {
    case "user_already_exists":
    case "email_exists":
      return "email";
    case "weak_password":
    case "same_password":
      return "password";
    default:
      return undefined;
  }
}

export function getAuthErrorMessage(error: AuthError): string {
  switch (error.code) {
    case "invalid_credentials":
      return "Incorrect email or password.";
    case "email_not_confirmed":
      return "Please confirm your email address before logging in.";
    case "user_already_exists":
    case "email_exists":
      return "An account with this email already exists.";
    case "weak_password":
      return "That password is too weak. Try a longer or less common password.";
    case "same_password":
      return "Your new password must be different from your current password.";
    case "over_email_send_rate_limit":
    case "over_request_rate_limit":
      return "Too many attempts. Please wait a few minutes and try again.";
    case "signup_disabled":
      return "New sign ups are currently disabled.";
    default:
      console.error("Supabase Auth error:", error.code, error.message);
      return GENERIC_ERROR_MESSAGE;
  }
}
