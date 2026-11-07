"use client";

import { useState, type ReactNode } from "react";
import SubscriptionChangeDialog, {
  type SubscriptionChange,
} from "@/components/account/SubscriptionChangeDialog";
import UpgradeDialog from "@/components/account/UpgradeDialog";
import ButtonLink, { buttonClassName } from "@/components/ButtonLink";
import EchoPlus from "@/components/EchoPlus";
import { AlertCircleIcon } from "@/components/icons";
import { FeatureItem } from "@/components/plans/PlanCard";
import SubscribeDialog from "@/components/plans/SubscribeDialog";
import { APP_NAME } from "@/lib/brand";
import { formatDate, formatPrice } from "@/lib/format";
import {
  BILLING_PERIODS,
  FREE_PLAN_NAME,
  SIMULATED_PAYMENT_METHOD,
  type BillingOption,
} from "@/lib/subscriptions/plans";
import type {
  ActiveSubscription,
  PastSubscription,
  SubscriptionLookup,
} from "@/lib/subscriptions/queries";

const HEADING_ID = "my-subscription-heading";

type OpenDialog =
  | { type: "upgrade"; subscription: ActiveSubscription; option: BillingOption }
  | { type: SubscriptionChange; subscription: ActiveSubscription; option?: BillingOption }
  | { type: "subscribe"; option: BillingOption };

type MySubscriptionProps = {
  lookup: SubscriptionLookup;
  pastSubscription: PastSubscription | null;
  billingOptions: BillingOption[];
};

// US-25 View My Subscription, US-26 to US-29 subscription management
export default function MySubscription({
  lookup,
  pastSubscription,
  billingOptions,
}: MySubscriptionProps) {
  // Kept above the plan views so a dialog's success message survives the refresh that follows.
  const [dialog, setDialog] = useState<OpenDialog | null>(null);
  const close = () => setDialog(null);

  if (!lookup.ok) {
    return (
      <p
        role="alert"
        className="flex items-start gap-2.5 rounded-md border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger"
      >
        <AlertCircleIcon className="mt-0.5 size-4 shrink-0" />
        We couldn&apos;t load your subscription right now. Refresh the page to try again.
      </p>
    );
  }

  return (
    <>
      {lookup.subscription ? (
        <EchoPlusSubscription
          subscription={lookup.subscription}
          billingOptions={billingOptions}
          onOpen={setDialog}
        />
      ) : (
        <FreePlan past={pastSubscription} billingOptions={billingOptions} onOpen={setDialog} />
      )}

      {dialog?.type === "upgrade" && (
        <UpgradeDialog current={dialog.subscription} option={dialog.option} onClose={close} />
      )}
      {(dialog?.type === "cancel" || dialog?.type === "switch" || dialog?.type === "resume") && (
        <SubscriptionChangeDialog
          change={dialog.type}
          subscription={dialog.subscription}
          target={dialog.option}
          onClose={close}
        />
      )}
      {dialog?.type === "subscribe" && (
        <SubscribeDialog option={dialog.option} onClose={close} showAccountLink={false} />
      )}
    </>
  );
}

function EchoPlusSubscription({
  subscription,
  billingOptions,
  onOpen,
}: {
  subscription: ActiveSubscription;
  billingOptions: BillingOption[];
  onOpen: (dialog: OpenDialog) => void;
}) {
  const period = BILLING_PERIODS[subscription.billingInterval];
  const change = subscription.scheduledChange;
  const switching = change === "switch_plan";
  const ending = change === "cancel" || change === "downgrade";
  const periodEnd = formatDate(subscription.currentPeriodEnd);
  const otherOption = billingOptions.find(
    (option) => option.interval !== subscription.billingInterval,
  );
  const benefits =
    billingOptions.find((option) => option.planId === subscription.planId)?.features ?? [];
  const nextPlan = switching ? subscription.scheduledPlan : null;
  const nextPeriod = nextPlan ? BILLING_PERIODS[nextPlan.billingInterval] : null;
  // The simulated charge at the next renewal: the scheduled plan's price after a downgrade.
  const renewalCents = nextPlan?.priceCents ?? subscription.priceCents;

  return (
    <section
      aria-labelledby={HEADING_ID}
      className="overflow-hidden rounded-xl border border-accent/25 bg-surface"
    >
      <PlanHeader
        highlighted
        name={
          <>
            <EchoPlus /> {period.label}
          </>
        }
        price={formatPrice(subscription.priceCents)}
        period={`/ ${period.unit}`}
      />

      {benefits.length > 0 && (
        <ul aria-label="Included" className="flex flex-col gap-2 border-t border-line px-6 py-4 text-sm">
          {benefits.map((benefit) => (
            <FeatureItem key={benefit} included>
              {benefit}
            </FeatureItem>
          ))}
        </ul>
      )}

      {/* US-30 View Renewal Information */}
      <dl className="flex flex-col gap-2.5 border-t border-line px-6 py-4 text-sm">
        <Detail label="Status">
          {ending ? (change === "cancel" ? "Cancelled" : `Moving to ${FREE_PLAN_NAME}`) : "Active"}
        </Detail>
        <Detail label="Automatic renewal">
          {ending ? "Off" : <span className="text-accent">On</span>}
        </Detail>
        <Detail label={ending ? "Echo+ access ends" : "Next renewal"}>{periodEnd}</Detail>
        {nextPeriod && (
          <Detail label="Upcoming plan">
            <EchoPlus /> {nextPeriod.label}
            <span className="font-normal text-muted"> from {periodEnd}</span>
          </Detail>
        )}
        {!ending && (
          <>
            <Detail label="Renewal amount">
              <span className="tabular-nums">{formatPrice(renewalCents)}</span>
            </Detail>
            <Detail label="Payment method">{SIMULATED_PAYMENT_METHOD}</Detail>
          </>
        )}
      </dl>

      <div className="flex flex-col gap-3 border-t border-line px-6 py-4 sm:flex-row sm:justify-center">
        {change ? (
          <button
            type="button"
            aria-haspopup="dialog"
            onClick={() => onOpen({ type: "resume", subscription })}
            className={`${buttonClassName("primary")} w-full ${ending ? "sm:w-auto sm:px-8" : "sm:flex-1"}`}
          >
            {switching ? `Stay on ${period.label}` : "Keep Echo+"}
          </button>
        ) : (
          otherOption &&
          (otherOption.available ? (
            <button
              type="button"
              aria-haspopup="dialog"
              onClick={() =>
                onOpen(
                  otherOption.interval === "year"
                    ? { type: "upgrade", subscription, option: otherOption }
                    : { type: "switch", subscription, option: otherOption },
                )
              }
              className={`${buttonClassName("primary")} w-full sm:flex-1`}
            >
              {otherOption.interval === "year" ? "Upgrade" : "Downgrade"} to {otherOption.label}
            </button>
          ) : (
            <button
              type="button"
              disabled
              className={`${buttonClassName("secondary")} w-full sm:flex-1`}
            >
              {otherOption.label} is unavailable
            </button>
          ))
        )}
        {!ending && (
          <button
            type="button"
            aria-haspopup="dialog"
            onClick={() => onOpen({ type: "cancel", subscription })}
            className={`${buttonClassName("danger")} w-full sm:flex-1`}
          >
            Cancel subscription
          </button>
        )}
      </div>
    </section>
  );
}

function FreePlan({
  past,
  billingOptions,
  onOpen,
}: {
  past: PastSubscription | null;
  billingOptions: BillingOption[];
  onOpen: (dialog: OpenDialog) => void;
}) {
  return (
    <section
      aria-labelledby={HEADING_ID}
      className="overflow-hidden rounded-xl border border-line bg-surface"
    >
      <PlanHeader name={FREE_PLAN_NAME} price="Free" note="No billing" />

      {past && billingOptions.length > 0 ? (
        <div className="border-t border-line px-6 py-5">
          <p className="text-sm leading-relaxed text-muted">
            <PastSubscriptionSummary past={past} /> Subscribe again to get <EchoPlus /> back.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {billingOptions.map((option) => (
              <button
                key={option.planId}
                type="button"
                aria-haspopup="dialog"
                disabled={!option.available}
                onClick={() => onOpen({ type: "subscribe", option })}
                className={`${buttonClassName("secondary")} w-full`}
              >
                <span>
                  <EchoPlus /> {option.label}
                </span>
                <span className="text-muted tabular-nums">
                  {option.available
                    ? `${formatPrice(option.priceCents)} / ${option.unit}`
                    : "Unavailable"}
                </span>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-start gap-4 border-t border-line px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm leading-relaxed text-muted">
            See everything <EchoPlus /> adds to {APP_NAME}.
          </p>
          <ButtonLink href="/plans" className="shrink-0">
            Explore {APP_NAME}+
          </ButtonLink>
        </div>
      )}
    </section>
  );
}

function PastSubscriptionSummary({ past }: { past: PastSubscription }) {
  const plan = (
    <span className="text-foreground">
      <EchoPlus /> {BILLING_PERIODS[past.billingInterval].label}
    </span>
  );
  const date = formatDate(past.endedAt);

  if (past.change === "cancel") {
    return (
      <>
        You cancelled {plan}; it ended on {date}.
      </>
    );
  }
  if (past.change === "downgrade") {
    return (
      <>
        You moved from {plan} to the free plan on {date}.
      </>
    );
  }
  return (
    <>
      Your {plan} subscription ended on {date}.
    </>
  );
}

function PlanHeader({
  name,
  price,
  period,
  note,
  highlighted = false,
}: {
  name: ReactNode;
  price: string;
  period?: string;
  note?: string;
  highlighted?: boolean;
}) {
  return (
    <div className={`px-6 pt-5 pb-6 ${highlighted ? "bg-accent/5" : ""}`}>
      <p className="text-xs font-medium tracking-wider text-muted uppercase">Current plan</p>
      <h2 id={HEADING_ID} className="mt-2 text-xl font-semibold tracking-tight">
        {name}
      </h2>
      <p className="mt-4 flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <span className="text-[2rem] leading-none font-semibold tracking-tight tabular-nums">
          {price}
        </span>
        {period && <span className="text-sm text-muted">{period}</span>}
        {note && <span className="text-sm text-muted">{note}</span>}
      </p>
    </div>
  );
}

function Detail({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="text-muted">{label}</dt>
      <dd className="min-w-0 text-right font-medium text-foreground">{children}</dd>
    </div>
  );
}
