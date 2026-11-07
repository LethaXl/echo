import "server-only";
import type { User } from "@supabase/supabase-js";
import { notFound, redirect } from "next/navigation";
import { cache } from "react";
import { getCurrentUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

/**
 * Whether the signed-in user is an Echo admin. Asks the database's `is_admin()`, which reads
 * `profiles.role` for the session's user, on every request, so a role removed in Supabase applies
 * on the next check. Never trusts metadata or anything sent by the browser. Errors count as no.
 */
export const isCurrentUserAdmin = cache(async (): Promise<boolean> => {
  const user = await getCurrentUser();
  if (!user) return false;

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("is_admin");
  if (error) {
    console.error("Failed to check admin access:", error.message);
    return false;
  }
  return data === true;
});

/**
 * For admin pages: visitors are sent to log in, and anyone who isn't an admin gets a 404 so the
 * page doesn't reveal itself.
 */
export async function requireAdmin(path: string): Promise<User> {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(path)}`);
  if (!(await isCurrentUserAdmin())) notFound();
  return user;
}
