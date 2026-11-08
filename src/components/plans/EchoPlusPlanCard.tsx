"use client";

import { useState } from "react";
import ButtonLink, { buttonClassName } from "@/components/ButtonLink";
import EchoPlus from "@/components/EchoPlus";
import PlanCard, {
  CurrentPlanStatus,
  FeatureItem,
  PlanPrice,
  PlanStatus,
} from "@/components/plans/PlanCard";
import SubscribeDialog from "@/components/plans/SubscribeDialog";
import { APP_NAME } from "@/lib/brand";
import { formatPrice } from "@/lib/format";
import {
  billingParam,
  type BillingInterval,
  type BillingOption,
} from "@/lib/subscriptions/plans";

type EchoPlusPlanCardProps = {
  options: BillingOption[];
  currentPlanId: string | null;
  signedIn: boolean;
  /** Billing option to show first, e.g. the one picked before logging in. */
  initialInterval: BillingInterval | null;
};

// US-23 Compare Subscription Plans, US-24 Subscribe to a Plan
export default function EchoPlusPlanCard({
  options,
  currentPlanId,
  signedIn,
  initialInterval,
}: EchoPlusPlanCardProps) {
  const [selectedId, setSelectedId] = useState(
    () =>
      (
        options.find((option) => option.planId === currentPlanId) ??
        options.find((option) => option.interval === initialInterval) ??
        options.find((option) => option.available) ??
        options[0]
      ).planId,
  );
  // Kept here rather than next to the button so the success message survives the refresh that
  // swaps the button for "Current plan".
  const [subscribing, setSubscribing] = useState<BillingOption | null>(null);
  const selected = options.find((option) => option.planId === selectedId) ?? options[0];
  const currentOption = options.find((option) => option.planId === currentPlanId);

  function action() {
    // Members keep their plan even if it's no longer offered.
    if (selected.planId === currentPlanId) return <CurrentPlanStatus />;

    // US-58: unavailable plans stay listed but can't be chosen, by new or current members.
    if (!selected.available) {
      return (
        <button type="button" disabled className={`${buttonClassName("primary")} w-full`}>
          {selected.label} is unavailable
        </button>
      );
    }

    // One active subscription at a time; upgrades are made from the account page.
    if (currentOption?.interval === "month" && selected.interval === "year") {
      return (
        <ButtonLink href="/account?tab=subscription" className="w-full">
          Upgrade to {selected.label}
        </ButtonLink>
      );
    }

    if (currentOption) {
      return (
        <PlanStatus>
          You&apos;re on <EchoPlus /> {currentOption.label}
        </PlanStatus>
      );
    }

    const label = `Choose ${selected.label}`;
    if (!signedIn) {
      const next = `/plans?billing=${billingParam(selected.interval)}`;
      return (
        <ButtonLink href={`/login?next=${encodeURIComponent(next)}`} className="w-full">
          {label}
        </ButtonLink>
      );
    }

    return (
      <button
        type="button"
        aria-haspopup="dialog"
        onClick={() => setSubscribing(selected)}
        className={`${buttonClassName("primary")} w-full`}
      >
        {label}
      </button>
    );
  }

  return (
    <>
      <PlanCard
        highlighted
        name={<EchoPlus />}
        aside={
          options.length > 1 && (
            <div
              role="radiogroup"
              aria-label="Billing"
              className="flex rounded-md border border-line bg-background p-0.5 text-xs font-medium max-md:ml-auto max-md:min-w-0"
            >
              {options.map((option) => {
                const checked = option.planId === selected.planId;
                return (
                  <button
                    key={option.planId}
                    type="button"
                    role="radio"
                    aria-checked={checked}
                    onClick={() => setSelectedId(option.planId)}
                    className={`rounded-[5px] px-3 py-1.5 transition-colors duration-150 max-md:min-h-11 max-md:px-2.5 ${
                      checked ? "bg-elevated text-foreground" : "text-muted hover:text-foreground"
                    }`}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          )
        }
        price={
          <div key={selected.planId} className="motion-safe:animate-fade-in-up">
            <PlanPrice
              amount={formatPrice(selected.priceCents)}
              period={selected.unit}
              note={
                !selected.available ? (
                  <span className="text-sm font-medium text-muted">Unavailable</span>
                ) : (
                  selected.savingsCents > 0 && (
                    <span className="text-sm font-medium text-accent">
                      Save {formatPrice(selected.savingsCents)}/year
                    </span>
                  )
                )
              }
            />
          </div>
        }
        description={selected.description}
        features={
          <>
            <p className="mb-2.5 text-sm text-muted">Everything in {APP_NAME}, plus</p>
            <ul key={selected.planId} className="flex flex-col gap-2 text-sm">
              {selected.features.map((feature) => (
                <FeatureItem key={feature} included>
                  <span className="font-medium text-foreground">{feature}</span>
                </FeatureItem>
              ))}
            </ul>
          </>
        }
        action={action()}
      />
      {subscribing && (
        <SubscribeDialog
          key={subscribing.planId}
          option={subscribing}
          onClose={() => setSubscribing(null)}
        />
      )}
    </>
  );
}
