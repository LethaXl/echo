import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import {
  RECOVERY_COOKIE_MAX_AGE_SECONDS,
  RECOVERY_COOKIE_NAME,
  RESET_PASSWORD_PATH,
} from "@/lib/auth/recovery";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

function getSafeRedirectUrl(next: string | null, origin: string): URL {
  const url = new URL(next ?? "/", origin);
  return url.origin === origin ? url : new URL("/", origin);
}

// Handles links in Supabase emails (sign-up confirmation and password reset).
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const redirectUrl = getSafeRedirectUrl(searchParams.get("next"), origin);
  const failureUrl = new URL("/login?error=invalid_link", origin);

  if (!isSupabaseConfigured()) {
    return NextResponse.redirect(failureUrl);
  }

  const supabase = await createClient();
  let verified = false;

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    verified = !error;
  } else if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    verified = !error;
  }

  if (!verified) {
    return NextResponse.redirect(failureUrl);
  }

  const response = NextResponse.redirect(redirectUrl);

  if (redirectUrl.pathname === RESET_PASSWORD_PATH) {
    response.cookies.set(RECOVERY_COOKIE_NAME, "1", {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: RECOVERY_COOKIE_MAX_AGE_SECONDS,
    });
  }

  return response;
}
