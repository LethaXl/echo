import type { Metadata } from "next";
import ButtonLink from "@/components/ButtonLink";
import EchoPlus from "@/components/EchoPlus";
import PageHeader from "@/components/PageHeader";
import EchoPlusPlanCard, { type BillingOption } from "@/components/plans/EchoPlusPlanCard";
import PlanCard, {
  CurrentPlanStatus,
  FeatureItem,
  PLAN_FEATURES,
  PlanPrice,
  PlanStatus,
} from "@/components/plans/PlanCard";
import { getCurrentUser } from "@/lib/auth/session";
import { APP_NAME } from "@/lib/brand";
import {
  getActiveSubscription,
  getSubscriptionPlans,
  type BillingInterval,
  type SubscriptionPlan,
} from "@/lib/subscriptions/queries";

export const metadata: Metadata = { title: "Plans" };

const INTERVALS: Record<BillingInterval, { label: string; unit: string }> = {
  month: { label: "Monthly", unit: "month" },
  year: { label: "Annual", unit: "year" },
};

function toBillingOptions(plans: SubscriptionPlan[]): BillingOption[] {
  const monthly = plans.find((plan) => plan.billingInterval === "month");
  return plans.map((plan) => {
    const interval = INTERVALS[plan.billingInterval];
    return {
      planId: plan.id,
      label: interval.label,
      unit: interval.unit,
      priceCents: plan.priceCents,
      description: plan.description ?? `Full ${APP_NAME}+ access, billed every ${interval.unit}.`,
      savingsCents:
        plan.billingInterval === "year" && monthly
          ? Math.max(0, monthly.priceCents * 12 - plan.priceCents)
          : 0,
    };
  });
}

// US-23 Compare Subscription Plans
export default async function PlansPage() {
  const [plans, user] = await Promise.all([getSubscriptionPlans(), getCurrentUser()]);
  const subscription = user ? await getActiveSubscription(user.id) : null;

  return (
    <div data-layout="wide" className="motion-safe:animate-fade-in-up">
      <PageHeader
        eyebrow="Plans"
        title={`Choose how you use ${APP_NAME}`}
        description={
          <>
            Browse and discover for free. <EchoPlus /> adds a watchlist, simulated viewing and
            ratings.
          </>
        }
      />

      <div className="mx-auto mt-5 grid max-w-4xl gap-5 md:grid-cols-2">
        <PlanCard
          name={APP_NAME}
          price={<PlanPrice amount="Free" />}
          description="Browse, search and explore movies and shows."
          features={
            <ul className="flex flex-col gap-2 text-sm">
              {PLAN_FEATURES.map((feature) => (
                <FeatureItem key={feature.label} included={feature.inEcho}>
                  {feature.label}
                </FeatureItem>
              ))}
            </ul>
          }
          action={
            !user ? (
              <ButtonLink href="/register" variant="secondary" className="w-full">
                Create a free account
              </ButtonLink>
            ) : subscription ? (
              <PlanStatus>
                Included with <EchoPlus />
              </PlanStatus>
            ) : (
              <CurrentPlanStatus />
            )
          }
        />

        {plans && plans.length > 0 ? (
          <EchoPlusPlanCard
            options={toBillingOptions(plans)}
            currentPlanId={subscription?.planId ?? null}
          />
        ) : (
          <p className="flex items-center justify-center rounded-md border border-line bg-surface px-6 py-10 text-center text-sm text-muted">
            <span>
              <EchoPlus /> plans couldn&apos;t be loaded right now. Please try again later.
            </span>
          </p>
        )}
      </div>
    </div>
  );
}
