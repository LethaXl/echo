import type { Metadata } from "next";
import { redirect } from "next/navigation";
import SubmitButton from "@/components/forms/SubmitButton";
import { logOut } from "@/lib/auth/actions";
import { isCurrentAccountDeactivated } from "@/lib/auth/session";
import { APP_NAME } from "@/lib/brand";

export const metadata: Metadata = { title: "Account Deactivated", robots: { index: false, follow: false } };

// US-64: the only page a signed-in deactivated account can open. Shows no account details.
export default async function AccountDeactivatedPage() {
  if (!(await isCurrentAccountDeactivated())) redirect("/");

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 py-10 text-center motion-safe:animate-fade-in-up max-md:px-0 max-md:py-4">
      <div className="w-full max-w-md rounded-2xl border border-line bg-surface px-8 py-8 max-md:px-4 max-md:py-5 max-md:[overflow-wrap:anywhere] max-md:[&_button]:min-h-11">
        <h1 className="text-2xl font-semibold tracking-tight">Account Deactivated</h1>
        <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-muted">
          Your {APP_NAME} account has been deactivated, so you can&apos;t access it right now. Don&apos;t
          worry, your watchlist, ratings and subscription are kept safe.
        </p>

        <div className="mt-6 rounded-xl bg-elevated/60 px-5 py-4 max-md:mt-4 max-md:px-3">
          <p className="text-sm font-medium">Think this is a mistake?</p>
          <p className="mt-1 text-sm text-muted">
            For account assistance, contact the project administrator at{" "}
            <span className="font-medium text-accent">aseefnazrul [at] gmail [dot] com</span>.
            Please include &quot;Echo&quot; in your email subject.
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
