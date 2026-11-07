import type { Metadata } from "next";
import PlanSettingsCard from "@/components/admin/PlanSettingsCard";
import DetailsBackLink from "@/components/details/DetailsBackLink";
import { requireAdmin } from "@/lib/admin/access";
import { getPlanCatalogue } from "@/lib/subscriptions/queries";

export const metadata: Metadata = {
  title: "Subscription Plans",
  robots: { index: false, follow: false },
};

// US-58 Enable or Disable Plans, US-59 Edit Plan Benefits, US-60 Edit Plan Prices
export default async function AdminPlansPage() {
  await requireAdmin("/admin/plans");
  const plans = await getPlanCatalogue();

  return (
    <div data-layout="wide" className="motion-safe:animate-fade-in-up">
      <DetailsBackLink href="/admin" label="Back to Admin Panel" />
      <h1 className="mt-5 text-2xl font-semibold tracking-tight">Subscription Plans</h1>

      {plans === null ? (
        <p
          role="alert"
          className="mt-6 rounded-xl border border-danger/30 bg-danger/10 px-6 py-5 text-center text-sm text-danger"
        >
          Subscription plans couldn&apos;t be loaded right now. Refresh the page to try again.
        </p>
      ) : plans.length === 0 ? (
        <p className="mt-6 rounded-xl border border-line bg-surface px-6 py-5 text-center text-sm text-muted">
          No subscription plans found.
        </p>
      ) : (
        <ul className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {plans.map((plan) => (
            <li key={plan.id} className="flex">
              <PlanSettingsCard plan={plan} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
