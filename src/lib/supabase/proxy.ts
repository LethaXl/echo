import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseConfig } from "./env";

const DEACTIVATED_PATH = "/account-deactivated";

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const config = getSupabaseConfig();
  if (!config) {
    return response;
  }

  const supabase = createServerClient(config.url, config.publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
        Object.entries(headers).forEach(([key, value]) =>
          response.headers.set(key, value),
        );
      },
    },
  });

  // Refreshes an expired auth token. Keep this immediately after creating the client.
  const { data } = await supabase.auth.getClaims();

  // Cave, viewer and admin pages still enforce access themselves. Redirect visitors here
  // before any of them starts streaming, including direct URL visits.
  const { pathname } = request.nextUrl;
  const keepsQuery =
    pathname === "/cave" || pathname.startsWith("/cave/") || pathname === "/admin" || pathname.startsWith("/admin/");
  const requiresSignIn = keepsQuery || pathname.startsWith("/watch/");
  if (!data?.claims && requiresSignIn) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    const returnTo = keepsQuery ? pathname + request.nextUrl.search : pathname;
    loginUrl.search = `?next=${encodeURIComponent(returnTo)}`;
    const redirect = NextResponse.redirect(loginUrl);
    response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
    return redirect;
  }

  // US-64: a deactivated account sees only the deactivation screen, which has its own log out.
  // Pages, server actions and the database check the status again; this keeps the whole site,
  // including public pages, consistent for a signed-in deactivated account.
  if (data?.claims && pathname !== DEACTIVATED_PATH) {
    const { data: active, error } = await supabase.rpc("is_account_active");
    if (!error && active === false) {
      const deactivatedUrl = request.nextUrl.clone();
      deactivatedUrl.pathname = DEACTIVATED_PATH;
      deactivatedUrl.search = "";
      const redirect = NextResponse.redirect(deactivatedUrl);
      response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
      return redirect;
    }
  }

  return response;
}
