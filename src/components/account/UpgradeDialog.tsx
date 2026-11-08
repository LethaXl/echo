"use client";

import { useActionState, useId, useState } from "react";
import { buttonClassName } from "@/components/ButtonLink";
import Dialog, {
  DialogCloseButton,
  DialogHeader,
  DialogLogo,
  DialogRow,
  DialogSummary,
} from "@/components/Dialog";
import EchoPlus from "@/components/EchoPlus";
import { FieldErrorPlacementContext } from "@/components/forms/FieldErrorPopover";
import FormMessage from "@/components/forms/FormMessage";
import PasswordField from "@/components/forms/PasswordField";
import SubmitButton from "@/components/forms/SubmitButton";
import { useFieldErrors } from "@/components/forms/useFieldErrors";
import { CreditCardIcon } from "@/components/icons";
import { initialFormState } from "@/lib/auth/form-state";
import { validateSubscribeForm } from "@/lib/auth/validation";
import { formatDate, formatPrice } from "@/lib/format";
import { upgradeSubscription } from "@/lib/subscriptions/actions";
import {
  addBillingPeriod,
  BILLING_PERIODS,
  SIMULATED_PAYMENT_METHOD,
  type BillingOption,
} from "@/lib/subscriptions/plans";
import type { ActiveSubscription } from "@/lib/subscriptions/queries";

type UpgradeDialogProps = {
  current: ActiveSubscription;
  option: BillingOption;
  onClose: () => void;
};

// US-26 Upgrade Subscription
export default function UpgradeDialog({ current, option, onClose }: UpgradeDialogProps) {
  const titleId = useId();
  const [state, formAction, pending] = useActionState(upgradeSubscription, initialFormState);
  const { formProps, errorFor } = useFieldErrors(state, validateSubscribeForm);
  const formError = state.status === "error" && !state.field ? state : null;
  // The server sets the real date when the upgrade is confirmed; this previews it.
  const [renewsAt] = useState(() => addBillingPeriod(new Date(), option.interval));
  const currentPeriod = BILLING_PERIODS[current.billingInterval];

  return (
    <Dialog labelledBy={titleId} busy={pending} onClose={onClose} mobileOptimized>
      {state.status === "success" ? (
        <div role="status">
          <DialogHeader
            titleId={titleId}
            title={
              <>
                You&apos;re on <EchoPlus /> {option.label}
              </>
            }
          >
            Your upgrade is complete and your annual plan has started.
          </DialogHeader>
          <DialogSummary>
            <DialogRow label="Plan">
              <EchoPlus /> {option.label}
            </DialogRow>
            <DialogRow label="Price">
              <span className="font-medium tabular-nums">{formatPrice(option.priceCents)}</span>
              <span className="text-muted"> / {option.unit}</span>
            </DialogRow>
            {state.values?.renewsAt && (
              <DialogRow label="Next renewal">{formatDate(state.values.renewsAt)}</DialogRow>
            )}
          </DialogSummary>
          <DialogCloseButton autoFocus className={`${buttonClassName("primary")} mt-6 w-full`}>
            Done
          </DialogCloseButton>
        </div>
      ) : (
        <FieldErrorPlacementContext value="below">
          <DialogHeader
            titleId={titleId}
            mark={<DialogLogo />}
            title={
              <>
                Upgrade to <EchoPlus /> {option.label}
              </>
            }
          >
            Your annual plan starts today and replaces your monthly plan.
          </DialogHeader>

          <div className="mt-5 overflow-hidden rounded-lg border border-accent/25 bg-accent/5">
            <div className="flex items-baseline justify-between gap-4 px-4 py-3.5">
              <span className="text-sm text-muted">New price</span>
              <span>
                <span className="text-2xl font-semibold tracking-tight tabular-nums">
                  {formatPrice(option.priceCents)}
                </span>
                <span className="text-sm text-muted"> / {option.unit}</span>
              </span>
            </div>
            <dl className="divide-y divide-line border-t border-accent/15 bg-background/40 px-4 text-sm">
              <DialogRow label="Current plan">
                <EchoPlus /> {currentPeriod.label}
                <span className="text-muted">
                  {" "}
                  · {formatPrice(current.priceCents)} / {currentPeriod.unit}
                </span>
              </DialogRow>
              <DialogRow label="New plan">
                <span className="font-medium">
                  <EchoPlus /> {option.label}
                </span>
              </DialogRow>
              <DialogRow label="Next renewal">{formatDate(renewsAt)}</DialogRow>
              <DialogRow label="Payment">
                <span className="inline-flex items-center gap-2">
                  <CreditCardIcon className="size-4 text-accent" />
                  {SIMULATED_PAYMENT_METHOD}
                </span>
              </DialogRow>
            </dl>
          </div>

          <form action={formAction} {...formProps} className="mt-5 flex flex-col gap-4">
            <input type="hidden" name="planId" value={option.planId} />
            <input type="hidden" name="expectedPriceCents" value={option.priceCents} />
            <PasswordField
              label="Account password"
              name="password"
              autoComplete="current-password"
              placeholder="Enter your password to confirm"
              disabled={pending}
              error={errorFor("password")}
            />

            {formError && <FormMessage state={formError} />}

            <div className="mt-2 grid grid-cols-2 gap-3 max-md:grid-cols-1 max-md:[&>button]:min-h-11">
              <DialogCloseButton
                disabled={pending}
                className={`${buttonClassName("secondary")} w-full`}
              >
                Cancel
              </DialogCloseButton>
              <SubmitButton size="md" pendingLabel="Upgrading">
                Confirm upgrade
              </SubmitButton>
            </div>
          </form>
        </FieldErrorPlacementContext>
      )}
    </Dialog>
  );
}
