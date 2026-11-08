import type { Metadata } from "next";
import ButtonLink from "@/components/ButtonLink";
import EchoPlus from "@/components/EchoPlus";
import PageHeader from "@/components/PageHeader";
import EchoPlusPlanCard from "@/components/plans/EchoPlusPlanCard";
import PlanCard, {
  CurrentPlanStatus,
  FeatureItem,
  PlanPrice,
  PlanStatus,
} from "@/components/plans/PlanCard";
import { getCurrentUser } from "@/lib/auth/session";
import { APP_NAME } from "@/lib/brand";
import {
  FREE_PLAN_NAME,
  isPaidPlan,
  parseBillingParam,
  toBillingOptions,
} from "@/lib/subscriptions/plans";
import { getActiveSubscription, getPlanCatalogue } from "@/lib/subscriptions/queries";

export const metadata: Metadata = { title: "Plans" };

// US-23 Compare Subscription Plans, US-24 Subscribe to a Plan
export default async function PlansPage({ searchParams }: PageProps<"/plans">) {
  const [catalogue, user, { billing }] = await Promise.all([
    getPlanCatalogue(),
    getCurrentUser(),
    searchParams,
  ]);
  const subscription = user ? await getActiveSubscription(user.id) : null;
  const freePlan = catalogue?.find((plan) => plan.isFree);
  const plans = catalogue?.filter(isPaidPlan) ?? [];

  return (
    <div data-layout="wide" className="motion-safe:animate-fade-in-up">
      <PageHeader
        eyebrow="Plans"
        title={`Choose how you use ${APP_NAME}`}
        description={
          <>
            Browse and discover for free, or get more with <EchoPlus />.
          </>
        }
      />

      <div className="mx-auto mt-5 grid max-w-4xl gap-5 md:grid-cols-2">
        <PlanCard
          compactMobile
          name={<span className="sr-only">{FREE_PLAN_NAME}</span>}
          price={<PlanPrice amount="Free" />}
          description={freePlan?.description ?? "Browse, search and explore movies and shows."}
          features={
            freePlan ? (
              <ul className="flex flex-col gap-2 text-sm">
                {freePlan.features.map((feature) => (
                  <FeatureItem key={feature} included>
                    {feature}
                  </FeatureItem>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted">Plan details couldn&apos;t be loaded right now.</p>
            )
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

        {plans.length > 0 ? (
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
