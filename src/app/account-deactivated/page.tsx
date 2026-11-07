import type { Metadata } from "next";
import { redirect } from "next/navigation";
import SubmitButton from "@/components/forms/SubmitButton";
import { logOut } from "@/lib/auth/actions";
import { isCurrentAccountDeactivated } from "@/lib/auth/session";
import { APP_NAME } from "@/lib/brand";

export const metadata: Metadata = { title: "Account Deactivated", robots: { index: false, follow: false } };

/** Placeholder address for the prototype; it isn't a link and nothing is sent. */
const SUPPORT_EMAIL = "support@echo.com";

// US-64: the only page a signed-in deactivated account can open. Shows no account details.
export default async function AccountDeactivatedPage() {
  if (!(await isCurrentAccountDeactivated())) redirect("/");

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 py-10 text-center motion-safe:animate-fade-in-up">
      <div className="w-full max-w-md rounded-2xl border border-line bg-surface px-8 py-8">
        <h1 className="text-2xl font-semibold tracking-tight">Account Deactivated</h1>
        <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-muted">
          Your {APP_NAME} account has been deactivated, so you can&apos;t access it right now. Don&apos;t
          worry, your watchlist, ratings and subscription are kept safe.
        </p>

        <div className="mt-6 rounded-xl bg-elevated/60 px-5 py-4">
          <p className="text-sm font-medium">Think this is a mistake?</p>
          <p className="mt-1 text-sm text-muted">
            Contact our support team at <span className="font-medium text-accent">{SUPPORT_EMAIL}</span>
          </p>
        </div>

        <form action={logOut} className="mt-6">
          <SubmitButton size="md" variant="secondary" pendingLabel="Logging out…">
            Log Out
          </SubmitButton>
        </form>
      </div>
    </div>
  );
}
