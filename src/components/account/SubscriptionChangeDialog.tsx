"use client";

import { useActionState, useId, type ReactNode } from "react";
import { buttonClassName, type ButtonVariant } from "@/components/ButtonLink";
import Dialog, {
  DialogCloseButton,
  DialogHeader,
  DialogRow,
  DialogSummary,
} from "@/components/Dialog";
import EchoPlus from "@/components/EchoPlus";
import FormMessage from "@/components/forms/FormMessage";
import SubmitButton from "@/components/forms/SubmitButton";
import { CreditCardIcon } from "@/components/icons";
import type { FormState } from "@/lib/auth/form-state";
import { initialFormState } from "@/lib/auth/form-state";
import { formatDate, formatPrice } from "@/lib/format";
import {
  cancelSubscription,
  resumeSubscription,
  switchSubscriptionPlan,
} from "@/lib/subscriptions/actions";
import {
  BILLING_PERIODS,
  SIMULATED_PAYMENT_METHOD,
  type BillingOption,
} from "@/lib/subscriptions/plans";
import type { ActiveSubscription } from "@/lib/subscriptions/queries";

/** `switch` moves to `target` at the next renewal; `resume` undoes whatever change is pending. */
export type SubscriptionChange = "cancel" | "switch" | "resume";

type Values = Record<string, string> | undefined;

type ChangeCopy = {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  title: ReactNode;
  description: ReactNode;
  rows: ReactNode;
  keepLabel: string;
  /** Defaults to secondary; primary when keeping is the safe choice next to a destructive confirm. */
  keepVariant?: ButtonVariant;
  confirmLabel: string;
  pendingLabel: string;
  confirmVariant: ButtonVariant;
  successTitle: ReactNode;
  success: (values: Values) => ReactNode;
};

function PlanLabel({ label }: { label: string }) {
  return (
    <>
      <EchoPlus /> {label}
    </>
  );
}

function PriceLabel({ cents, unit }: { cents: number; unit: string }) {
  return (
    <span className="text-muted">
      {" "}
      · {formatPrice(cents)} / {unit}
    </span>
  );
}

function copyFor(
  change: SubscriptionChange,
  subscription: ActiveSubscription,
  target: BillingOption | undefined,
): ChangeCopy {
  const period = BILLING_PERIODS[subscription.billingInterval];
  const periodEnd = formatDate(subscription.currentPeriodEnd);
  const dateFrom = (values: Values, key: string) =>
    values?.[key] ? formatDate(values[key]) : periodEnd;

  if (change === "cancel") {
    // US-28 Cancel My Subscription
    return {
      action: cancelSubscription,
      title: "Cancel your subscription?",
      description: "Automatic renewal stops and you won't be charged again.",
      rows: (
        <>
          <DialogRow label="Subscription">
            <PlanLabel label={period.label} />
          </DialogRow>
          <DialogRow label="Echo+ access until">
            <span className="font-medium">{periodEnd}</span>
          </DialogRow>
        </>
      ),
      keepLabel: "Keep subscription",
      keepVariant: "primary",
      confirmLabel: "Cancel subscription",
      pendingLabel: "Cancelling",
      confirmVariant: "danger",
      successTitle: "Subscription cancelled",
      success: (values) => (
        <>
          You&apos;ll keep <EchoPlus /> until {dateFrom(values, "endsAt")}. Automatic renewal is
          off.
        </>
      ),
    };
  }

  if (change === "switch" && target) {
    return {
      action: switchSubscriptionPlan,
      title: (
        <>
          Downgrade to <PlanLabel label={target.label} />?
        </>
      ),
      description: `You keep the ${period.label.toLowerCase()} plan you've paid for until it renews, then move to ${target.label.toLowerCase()} billing.`,
      rows: (
        <>
          <DialogRow label="Current plan">
            <PlanLabel label={period.label} />
            <PriceLabel cents={subscription.priceCents} unit={period.unit} />
          </DialogRow>
          <DialogRow label="New plan">
            <span className="font-medium">
              <PlanLabel label={target.label} />
            </span>
            <PriceLabel cents={target.priceCents} unit={target.unit} />
          </DialogRow>
          <DialogRow label="Changes on">
            <span className="font-medium">{periodEnd}</span>
          </DialogRow>
          <DialogRow label="Payment">
            <span className="inline-flex items-center gap-2">
              <CreditCardIcon className="size-4 text-accent" />
              {SIMULATED_PAYMENT_METHOD}
            </span>
          </DialogRow>
        </>
      ),
      keepLabel: `Keep ${period.label}`,
      confirmLabel: `Downgrade to ${target.label}`,
      pendingLabel: "Downgrading",
      confirmVariant: "primary",
      successTitle: "Downgrade scheduled",
      success: (values) => (
        <>
          You&apos;ll move to <PlanLabel label={target.label} /> on{" "}
          {dateFrom(values, "switchesAt")}.
        </>
      ),
    };
  }

  // US-29 Subscribe Again (before the period ends), or keeping the current plan instead of a switch
  const undoingSwitch = subscription.scheduledChange === "switch_plan";
  return {
    action: resumeSubscription,
    title: undoingSwitch ? (
      <>
        Stay on <PlanLabel label={period.label} />?
      </>
    ) : (
      <>
        Keep <EchoPlus />?
      </>
    ),
    description: undoingSwitch
      ? "Your scheduled downgrade is cancelled. Your plan and renewal date stay the same."
      : "Automatic renewal turns back on. Your plan and renewal date stay the same.",
    rows: (
      <>
        <DialogRow label="Plan">
          <PlanLabel label={period.label} />
        </DialogRow>
        <DialogRow label="Price">
          <span className="font-medium tabular-nums">{formatPrice(subscription.priceCents)}</span>
          <span className="text-muted"> / {period.unit}</span>
        </DialogRow>
        <DialogRow label="Next renewal">
          <span className="font-medium">{periodEnd}</span>
        </DialogRow>
      </>
    ),
    keepLabel: "Not now",
    confirmLabel: undoingSwitch ? `Stay on ${period.label}` : "Keep Echo+",
    pendingLabel: "Saving",
    confirmVariant: "primary",
    successTitle: undoingSwitch ? (
      <>
        You&apos;re staying on <PlanLabel label={period.label} />
      </>
    ) : (
      <>
        <EchoPlus /> will continue
      </>
    ),
    success: (values) => <>Your plan renews on {dateFrom(values, "renewsAt")}.</>,
  };
}

type SubscriptionChangeDialogProps = {
  change: SubscriptionChange;
  subscription: ActiveSubscription;
  /** The plan to switch to, for `switch`. */
  target?: BillingOption;
  onClose: () => void;
};

export default function SubscriptionChangeDialog({
  change,
  subscription,
  target,
  onClose,
}: SubscriptionChangeDialogProps) {
  const titleId = useId();
  const copy = copyFor(change, subscription, target);
  const [state, formAction, pending] = useActionState(copy.action, initialFormState);

  return (
    <Dialog labelledBy={titleId} busy={pending} onClose={onClose}>
      {state.status === "success" ? (
        <div role="status">
          <DialogHeader titleId={titleId} title={copy.successTitle}>
            {copy.success(state.values)}
          </DialogHeader>
          <DialogCloseButton autoFocus className={`${buttonClassName("primary")} mt-6 w-full`}>
            Done
          </DialogCloseButton>
        </div>
      ) : (
        <>
          <DialogHeader titleId={titleId} title={copy.title}>
            {copy.description}
          </DialogHeader>
          <DialogSummary>{copy.rows}</DialogSummary>

          <form action={formAction} className="mt-5 flex flex-col gap-4">
            {target && (
              <>
                <input type="hidden" name="planId" value={target.planId} />
                <input type="hidden" name="expectedPriceCents" value={target.priceCents} />
              </>
            )}
            {state.status === "error" && <FormMessage state={state} />}

            <div className="mt-1 grid grid-cols-2 gap-3">
              <DialogCloseButton
                disabled={pending}
                data-autofocus
                className={`${buttonClassName(copy.keepVariant ?? "secondary")} w-full`}
              >
                {copy.keepLabel}
              </DialogCloseButton>
              <SubmitButton
                size="md"
                variant={copy.confirmVariant}
                pendingLabel={copy.pendingLabel}
              >
                {copy.confirmLabel}
              </SubmitButton>
            </div>
          </form>
        </>
      )}
    </Dialog>
  );
}
