"use client";

import { useActionState, useId } from "react";
import ButtonLink, { buttonClassName } from "@/components/ButtonLink";
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
import { subscribe } from "@/lib/subscriptions/actions";
import { SIMULATED_PAYMENT_METHOD, type BillingOption } from "@/lib/subscriptions/plans";

type SubscribeDialogProps = {
  option: BillingOption;
  onClose: () => void;
  /** Offer a link to Account → Subscription once subscribed; off when already there. */
  showAccountLink?: boolean;
};

// US-24 Subscribe to a Plan, US-29 Subscribe Again
export default function SubscribeDialog({
  option,
  onClose,
  showAccountLink = true,
}: SubscribeDialogProps) {
  const titleId = useId();
  const [state, formAction, pending] = useActionState(subscribe, initialFormState);
  const { formProps, errorFor } = useFieldErrors(state, validateSubscribeForm);
  const formError = state.status === "error" && !state.field ? state : null;

  return (
    <Dialog labelledBy={titleId} busy={pending} onClose={onClose}>
      {state.status === "success" ? (
        <div role="status">
          <DialogHeader
            titleId={titleId}
            title={
              <>
                Welcome to <EchoPlus />
              </>
            }
          >
            Your subscription is active and ready to use.
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
          <div className={`mt-6 grid gap-3 ${showAccountLink ? "grid-cols-2" : ""}`}>
            <DialogCloseButton
              autoFocus
              className={`${buttonClassName(showAccountLink ? "secondary" : "primary")} w-full`}
            >
              Done
            </DialogCloseButton>
            {showAccountLink && (
              <ButtonLink href="/account?tab=subscription" className="w-full">
                My subscription
              </ButtonLink>
            )}
          </div>
        </div>
      ) : (
        <FieldErrorPlacementContext value="below">
          <DialogHeader titleId={titleId} mark={<DialogLogo />} title="Confirm your subscription">
            You&apos;re subscribing to <EchoPlus /> {option.label}
          </DialogHeader>

          <div className="mt-5 overflow-hidden rounded-lg border border-accent/25 bg-accent/5">
            <div className="flex items-baseline justify-between gap-4 px-4 py-3.5">
              <span className="text-sm text-muted">Price</span>
              <span>
                <span className="text-2xl font-semibold tracking-tight tabular-nums">
                  {formatPrice(option.priceCents)}
                </span>
                <span className="text-sm text-muted"> / {option.unit}</span>
              </span>
            </div>
            <dl className="divide-y divide-line border-t border-accent/15 bg-background/40 px-4 text-sm">
              <DialogRow label="Billing">Every {option.unit}, renews automatically</DialogRow>
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
            <PasswordField
              label="Account password"
              name="password"
              autoComplete="current-password"
              placeholder="Enter your password to confirm"
              disabled={pending}
              error={errorFor("password")}
            />

            {formError && <FormMessage state={formError} />}

            <div className="mt-2 grid grid-cols-2 gap-3">
              <DialogCloseButton
                disabled={pending}
                className={`${buttonClassName("secondary")} w-full`}
              >
                Cancel
              </DialogCloseButton>
              <SubmitButton size="md" pendingLabel="Confirming">
                Confirm subscription
              </SubmitButton>
            </div>
          </form>
        </FieldErrorPlacementContext>
      )}
    </Dialog>
  );
}
