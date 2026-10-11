import type { Metadata } from "next";
import { redirect } from "next/navigation";
import AccountSettings from "@/components/account/AccountSettings";
import { getAccountDetails } from "@/lib/account/queries";
import { parseAccountSection } from "@/lib/account/sections";
import { getCurrentUser } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Account" };

export default async function AccountPage({ searchParams }: PageProps<"/account">) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login?next=/account");
  }

  const [details, { tab }] = await Promise.all([getAccountDetails(user), searchParams]);
  const section = parseAccountSection(tab) ?? "overview";

  return (
    <div className="mx-auto w-full max-w-xl motion-safe:animate-fade-in-up">
      <h1 className="text-center text-2xl font-semibold tracking-tight">Account</h1>
      {/* Keyed so following a link to another tab while on /account switches to it. */}
      <AccountSettings key={section} details={details} initialSection={section} />
    </div>
  );
}
