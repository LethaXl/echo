"use client";

import { useState } from "react";
import EditPlanDialog from "@/components/admin/EditPlanDialog";
import PlanAvailabilityDialog from "@/components/admin/PlanAvailabilityDialog";
import { buttonClassName } from "@/components/ButtonLink";
import { FeatureItem } from "@/components/plans/PlanCard";
import { formatPrice } from "@/lib/format";
import { BILLING_PERIODS, isPaidPlan, type PlanSettings } from "@/lib/subscriptions/plans";

type OpenDialog = { type: "edit" } | { type: "availability"; enable: boolean };

// US-58 to US-60: one plan's settings on /admin/plans
export default function PlanSettingsCard({ plan }: { plan: PlanSettings }) {
  const [dialog, setDialog] = useState<OpenDialog | null>(null);
  const close = () => setDialog(null);
  const paid = isPaidPlan(plan);
  const statusId = `plan-${plan.id}-status`;

  return (
    <article className="flex w-full flex-col rounded-xl border border-line bg-surface px-6 py-5 max-md:min-w-0 max-md:px-4 max-md:py-4 max-md:[overflow-wrap:anywhere]">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-[1.0625rem] font-semibold tracking-tight">{plan.name}</h2>
        {paid && (
          <button
            type="button"
            role="switch"
            aria-checked={plan.isAvailable}
            aria-label={`${plan.name} available`}
            aria-describedby={statusId}
            onClick={() => setDialog({ type: "availability", enable: !plan.isAvailable })}
            className={`relative inline-flex h-6 w-10 shrink-0 items-center rounded-full border transition-colors duration-150 max-md:before:absolute max-md:before:-inset-y-2.5 max-md:before:inset-x-0 ${
              plan.isAvailable
                ? "border-accent bg-accent hover:bg-accent-hover"
                : "border-line bg-background hover:border-muted/40"
            }`}
          >
            <span
              aria-hidden="true"
              className={`size-4 rounded-full transition-transform duration-150 ${
                plan.isAvailable ? "translate-x-5 bg-on-accent" : "translate-x-1 bg-muted"
              }`}
            />
          </button>
        )}
      </div>

      <p className="mt-3 flex items-baseline gap-1.5 max-md:flex-wrap">
        <span className="text-2xl leading-none font-semibold tracking-tight tabular-nums">
          {paid ? formatPrice(plan.priceCents) : "Free"}
        </span>
        {paid && (
          <span className="text-sm text-muted">/ {BILLING_PERIODS[plan.billingInterval].unit}</span>
        )}
      </p>
      <p id={statusId} className="mt-1.5 text-sm text-muted">
        {!paid ? (
          "Always available"
        ) : plan.isAvailable ? (
          <span className="text-accent">Available</span>
        ) : (
          "Unavailable"
        )}
      </p>

      <ul className="mt-4 flex flex-col gap-2 border-t border-line pt-4 text-sm max-md:mt-3 max-md:pt-3">
        {plan.features.map((feature) => (
          <FeatureItem key={feature} included>
            {feature}
          </FeatureItem>
        ))}
      </ul>

      <div className="mt-auto pt-5 max-md:pt-3">
        <button
          type="button"
          aria-haspopup="dialog"
          onClick={() => setDialog({ type: "edit" })}
          className={`${buttonClassName("secondary")} w-full max-md:min-h-11`}
        >
          Edit
        </button>
      </div>

      {dialog?.type === "edit" && <EditPlanDialog plan={plan} onClose={close} />}
      {dialog?.type === "availability" && (
        <PlanAvailabilityDialog plan={plan} enable={dialog.enable} onClose={close} />
      )}
    </article>
  );
}
