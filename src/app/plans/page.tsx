import type { Metadata } from "next";
import ButtonLink from "@/components/ButtonLink";
import EchoPlus from "@/components/EchoPlus";
import PageHeader from "@/components/PageHeader";
import EchoPlusPlanCard from "@/components/plans/EchoPlusPlanCard";
import PlanCard, {
  CurrentPlanStatus,
  FeatureItem,
  PLAN_FEATURES,
  PlanPrice,
  PlanStatus,
} from "@/components/plans/PlanCard";
import { getCurrentUser } from "@/lib/auth/session";
import { APP_NAME } from "@/lib/brand";
import { FREE_PLAN_NAME, parseBillingParam, toBillingOptions } from "@/lib/subscriptions/plans";
import { getActiveSubscription, getSubscriptionPlans } from "@/lib/subscriptions/queries";

export const metadata: Metadata = { title: "Plans" };

// US-23 Compare Subscription Plans, US-24 Subscribe to a Plan
export default async function PlansPage({ searchParams }: PageProps<"/plans">) {
  const [plans, user, { billing }] = await Promise.all([
    getSubscriptionPlans(),
    getCurrentUser(),
    searchParams,
  ]);
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
          name={<span className="sr-only">{FREE_PLAN_NAME}</span>}
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
            signedIn={user !== null}
            initialInterval={parseBillingParam(billing)}
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
