import type { Metadata } from "next";
import { redirect } from "next/navigation";
import AccountSettings from "@/components/account/AccountSettings";
import { getAccountDetails } from "@/lib/account/queries";
import { getCurrentUser } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Account" };

export default async function AccountPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const details = await getAccountDetails(user);

  return (
    <div className="mx-auto w-full max-w-xl motion-safe:animate-fade-in-up">
      <h1 className="text-center text-2xl font-semibold tracking-tight">Account</h1>
      <AccountSettings details={details} />
    </div>
  );
}
