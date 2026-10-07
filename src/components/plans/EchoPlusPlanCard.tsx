"use client";

import { useState } from "react";
import EchoPlus from "@/components/EchoPlus";
import PlanCard, {
  CurrentPlanStatus,
  FeatureItem,
  PLAN_FEATURES,
  PlanPrice,
} from "@/components/plans/PlanCard";
import PlanChoiceButton from "@/components/plans/PlanChoiceButton";
import { APP_NAME } from "@/lib/brand";
import { formatPrice } from "@/lib/format";

/** One way to pay for Echo+, e.g. monthly. Every option includes the same features. */
export type BillingOption = {
  planId: string;
  label: string;
  unit: string;
  priceCents: number;
  description: string;
  /** Savings over a year of the monthly option, in cents. */
  savingsCents: number;
};

type EchoPlusPlanCardProps = {
  options: BillingOption[];
  currentPlanId: string | null;
};

export default function EchoPlusPlanCard({ options, currentPlanId }: EchoPlusPlanCardProps) {
  const [selectedId, setSelectedId] = useState(
    () => options.find((option) => option.planId === currentPlanId)?.planId ?? options[0].planId,
  );
  const selected = options.find((option) => option.planId === selectedId) ?? options[0];

  return (
    <PlanCard
      highlighted
      name={<EchoPlus />}
      aside={
        options.length > 1 && (
          <div
            role="radiogroup"
            aria-label="Billing"
            className="flex rounded-md border border-line bg-background p-0.5 text-xs font-medium"
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
                  className={`rounded-[5px] px-3 py-1.5 transition-colors duration-150 ${
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
              selected.savingsCents > 0 && (
                <span className="text-sm font-medium text-accent">
                  Save {formatPrice(selected.savingsCents)}/year
                </span>
              )
            }
          />
        </div>
      }
      description={selected.description}
      features={
        <>
          <p className="mb-2.5 text-sm text-muted">Everything in {APP_NAME}, plus</p>
          <ul className="flex flex-col gap-2 text-sm">
            {PLAN_FEATURES.filter((feature) => !feature.inEcho).map((feature) => (
              <FeatureItem key={feature.label} included>
                <span className="font-medium text-foreground">{feature.label}</span>
              </FeatureItem>
            ))}
          </ul>
        </>
      }
      action={
        selected.planId === currentPlanId ? (
          <CurrentPlanStatus />
        ) : (
          <PlanChoiceButton label={`Choose ${selected.label}`} variant="primary" />
        )
      }
    />
  );
}
