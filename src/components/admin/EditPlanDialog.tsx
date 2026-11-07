"use client";

import { useActionState, useId, useState, type FormEvent } from "react";
import { buttonClassName } from "@/components/ButtonLink";
import Dialog, { DialogCloseButton, DialogHeader, useDialogClose } from "@/components/Dialog";
import FormMessage from "@/components/forms/FormMessage";
import SubmitButton from "@/components/forms/SubmitButton";
import { inputClassName, labelClassName } from "@/components/forms/TextField";
import { ChevronDownIcon, XIcon } from "@/components/icons";
import { updatePlanSettings } from "@/lib/admin/plan-actions";
import { initialFormState } from "@/lib/auth/form-state";
import {
  benefitErrors,
  benefitListError,
  formatPriceInput,
  MAX_BENEFIT_LENGTH,
  MAX_BENEFITS,
  validatePrice,
} from "@/lib/subscriptions/plan-settings";
import { BILLING_PERIODS, type PlanSettings } from "@/lib/subscriptions/plans";

const ROW_BUTTON =
  "inline-flex size-10 shrink-0 items-center justify-center rounded-md border border-line text-muted transition-colors duration-150 hover:bg-elevated hover:text-foreground disabled:pointer-events-none disabled:opacity-40";

type Benefit = { id: number; text: string };

type EditPlanDialogProps = {
  plan: PlanSettings;
  onClose: () => void;
};

// US-59 Edit Plan Benefits, US-60 Edit Plan Prices
export default function EditPlanDialog({ plan, onClose }: EditPlanDialogProps) {
  const titleId = useId();
  const priceId = useId();
  const [state, formAction, pending] = useActionState(updatePlanSettings, initialFormState);

  // The values the dialog opened with, kept even when a save refreshes `plan`.
  const [initial] = useState(() => ({
    price: formatPriceInput(plan.priceCents),
    benefits: plan.features,
  }));
  const [price, setPrice] = useState(initial.price);
  const [benefits, setBenefits] = useState<Benefit[]>(() =>
    initial.benefits.map((text, id) => ({ id, text })),
  );
  const [focusId, setFocusId] = useState<number | null>(null);
  const [attempted, setAttempted] = useState(false);
  const [confirmingDiscard, setConfirmingDiscard] = useState(false);

  const paid = !plan.isFree && plan.billingInterval !== null;
  const texts = benefits.map((benefit) => benefit.text);
  const dirty =
    (paid && price !== initial.price) ||
    texts.length !== initial.benefits.length ||
    texts.some((text, index) => text !== initial.benefits[index]);

  const priceResult = paid ? validatePrice(price) : null;
  const priceError = priceResult && !priceResult.ok ? priceResult.message : null;
  const rowErrors = benefitErrors(texts);
  const listError = benefitListError(texts);
  const valid = !priceError && !listError && rowErrors.every((error) => error === null);

  function canClose() {
    if (state.status === "success" || !dirty) return true;
    setConfirmingDiscard(true);
    return false;
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    setAttempted(true);
    setConfirmingDiscard(false);
    if (!valid) event.preventDefault();
  }

  function updateBenefit(id: number, text: string) {
    setBenefits((current) => current.map((item) => (item.id === id ? { ...item, text } : item)));
  }

  function moveBenefit(index: number, offset: -1 | 1) {
    setBenefits((current) => {
      const next = [...current];
      [next[index], next[index + offset]] = [next[index + offset], next[index]];
      return next;
    });
  }

  function removeBenefit(id: number) {
    setBenefits((current) => current.filter((item) => item.id !== id));
  }

  function addBenefit() {
    const id = Math.max(-1, ...benefits.map((item) => item.id)) + 1;
    setBenefits((current) => [...current, { id, text: "" }]);
    setFocusId(id);
  }

  return (
    <Dialog labelledBy={titleId} busy={pending} canClose={canClose} onClose={onClose}>
      {state.status === "success" ? (
        <div role="status">
          <DialogHeader titleId={titleId} title="Changes saved">
            {plan.name} has been updated on the Plans page.
          </DialogHeader>
          <DialogCloseButton autoFocus className={`${buttonClassName("primary")} mt-6 w-full`}>
            Done
          </DialogCloseButton>
        </div>
      ) : (
        <>
          <DialogHeader titleId={titleId} title={`Edit ${plan.name}`}>
            {paid
              ? "Current subscribers keep the price they signed up at."
              : `${plan.name} is always free and available.`}
          </DialogHeader>

          <form
            action={formAction}
            onSubmit={handleSubmit}
            noValidate
            className="mt-6 flex flex-col gap-5"
          >
            <input type="hidden" name="planId" value={plan.id} />

            {paid && plan.billingInterval && (
              <div className="flex flex-col gap-1.5">
                <label htmlFor={priceId} className={labelClassName}>
                  Price
                </label>
                <div className="flex items-center gap-3">
                  <div className="relative flex-1">
                    <span
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-muted"
                    >
                      $
                    </span>
                    <input
                      id={priceId}
                      name="price"
                      inputMode="decimal"
                      autoComplete="off"
                      data-autofocus
                      value={price}
                      onChange={(event) => setPrice(event.target.value)}
                      aria-invalid={attempted && priceError ? true : undefined}
                      aria-describedby={attempted && priceError ? `${priceId}-error` : undefined}
                      className={`${inputClassName} pl-7 tabular-nums`}
                    />
                  </div>
                  <span className="shrink-0 text-sm text-muted">
                    / {BILLING_PERIODS[plan.billingInterval].unit}
                  </span>
                </div>
                {attempted && priceError && (
                  <p id={`${priceId}-error`} className="text-xs text-danger">
                    {priceError}
                  </p>
                )}
              </div>
            )}

            <fieldset className="flex flex-col gap-2">
              <legend className={`${labelClassName} mb-1.5`}>Benefits</legend>
              <ol className="flex flex-col gap-2">
                {benefits.map((benefit, index) => {
                  const error = attempted ? rowErrors[index] : null;
                  const errorId = `${titleId}-benefit-${benefit.id}-error`;
                  return (
                    <li key={benefit.id} className="flex flex-col gap-1">
                      <div className="flex items-center gap-1.5">
                        <input
                          name="benefit"
                          value={benefit.text}
                          onChange={(event) => updateBenefit(benefit.id, event.target.value)}
                          maxLength={MAX_BENEFIT_LENGTH}
                          autoFocus={benefit.id === focusId}
                          autoComplete="off"
                          aria-label={`Benefit ${index + 1}`}
                          aria-invalid={error ? true : undefined}
                          aria-describedby={error ? errorId : undefined}
                          className={`${inputClassName} min-w-0 flex-1`}
                        />
                        <button
                          type="button"
                          onClick={() => moveBenefit(index, -1)}
                          disabled={index === 0}
                          aria-label={`Move benefit ${index + 1} up`}
                          className={ROW_BUTTON}
                        >
                          <ChevronDownIcon className="size-4 rotate-180" />
                        </button>
                        <button
                          type="button"
                          onClick={() => moveBenefit(index, 1)}
                          disabled={index === benefits.length - 1}
                          aria-label={`Move benefit ${index + 1} down`}
                          className={ROW_BUTTON}
                        >
                          <ChevronDownIcon className="size-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => removeBenefit(benefit.id)}
                          disabled={benefits.length === 1}
                          aria-label={`Remove benefit ${index + 1}`}
                          className={`${ROW_BUTTON} hover:text-danger`}
                        >
                          <XIcon className="size-4" />
                        </button>
                      </div>
                      {error && (
                        <p id={errorId} className="text-xs text-danger">
                          {error}
                        </p>
                      )}
                    </li>
                  );
                })}
              </ol>
              {attempted && listError && <p className="text-xs text-danger">{listError}</p>}
              <button
                type="button"
                onClick={addBenefit}
                disabled={benefits.length >= MAX_BENEFITS}
                className={`${buttonClassName("secondary")} mt-1 w-full`}
              >
                Add benefit
              </button>
            </fieldset>

            {state.status === "error" && <FormMessage state={state} />}

            {confirmingDiscard ? (
              <DiscardPrompt onKeepEditing={() => setConfirmingDiscard(false)} />
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <DialogCloseButton
                  disabled={pending}
                  className={`${buttonClassName("secondary")} w-full`}
                >
                  Cancel
                </DialogCloseButton>
                <SubmitButton size="md" pendingLabel="Saving" disabled={!dirty}>
                  Save changes
                </SubmitButton>
              </div>
            )}
          </form>
        </>
      )}
    </Dialog>
  );
}

function DiscardPrompt({ onKeepEditing }: { onKeepEditing: () => void }) {
  const close = useDialogClose();
  return (
    <div role="alert" className="rounded-lg border border-line bg-background/60 p-4">
      <p className="text-center text-sm">Discard your unsaved changes?</p>
      <div className="mt-3 grid grid-cols-2 gap-3">
        <button
          type="button"
          autoFocus
          onClick={onKeepEditing}
          className={`${buttonClassName("secondary")} w-full`}
        >
          Keep editing
        </button>
        <button
          type="button"
          onClick={() => close(true)}
          className={`${buttonClassName("danger")} w-full`}
        >
          Discard
        </button>
      </div>
    </div>
  );
}
