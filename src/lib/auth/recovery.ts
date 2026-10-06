import "server-only";
import { cookies } from "next/headers";

// Set only after a password-reset email link is verified, so a signed-in
// session alone cannot change the password without the current one.
export const RECOVERY_COOKIE_NAME = "echo-password-recovery";
export const RECOVERY_COOKIE_MAX_AGE_SECONDS = 15 * 60;
export const RESET_PASSWORD_PATH = "/reset-password";

export async function hasRecoveryCookie(): Promise<boolean> {
  const cookieStore = await cookies();
  return cookieStore.has(RECOVERY_COOKIE_NAME);
}

export async function clearRecoveryCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(RECOVERY_COOKIE_NAME);
}
