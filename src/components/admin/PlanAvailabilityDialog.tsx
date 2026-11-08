"use client";

import { useActionState, useId } from "react";
import { buttonClassName } from "@/components/ButtonLink";
import Dialog, { DialogCloseButton, DialogHeader } from "@/components/Dialog";
import FormMessage from "@/components/forms/FormMessage";
import SubmitButton from "@/components/forms/SubmitButton";
import { setPlanAvailability } from "@/lib/admin/plan-actions";
import { initialFormState } from "@/lib/auth/form-state";
import type { PlanSettings } from "@/lib/subscriptions/plans";

type PlanAvailabilityDialogProps = {
  plan: PlanSettings;
  /** Fixed when the dialog opens, so the copy doesn't flip once the saved change refreshes `plan`. */
  enable: boolean;
  onClose: () => void;
};

// US-58 Enable or Disable Plans
export default function PlanAvailabilityDialog({ plan, enable, onClose }: PlanAvailabilityDialogProps) {
  const titleId = useId();
  const [state, formAction, pending] = useActionState(setPlanAvailability, initialFormState);

  return (
    <Dialog labelledBy={titleId} busy={pending} onClose={onClose} mobileOptimized>
      {state.status === "success" ? (
        <div role="status">
          <DialogHeader titleId={titleId} title={`${plan.name} ${enable ? "enabled" : "disabled"}`}>
            {enable
              ? "Members can subscribe and switch to this plan again."
              : "It's shown as unavailable on the Plans page. Current subscribers keep it."}
          </DialogHeader>
          <DialogCloseButton autoFocus className={`${buttonClassName("primary")} mt-6 w-full`}>
            Done
          </DialogCloseButton>
        </div>
      ) : (
        <>
          <DialogHeader titleId={titleId} title={`${enable ? "Enable" : "Disable"} ${plan.name}?`}>
            {enable
              ? "Members will be able to subscribe and switch to this plan from the Plans page."
              : "It stays on the Plans page as unavailable, and no one can subscribe or switch to it. Current subscribers keep their plan and price, and can still cancel."}
          </DialogHeader>

          <form action={formAction} className="mt-6 flex flex-col gap-4">
            <input type="hidden" name="planId" value={plan.id} />
            <input type="hidden" name="available" value={String(enable)} />
            {state.status === "error" && <FormMessage state={state} />}

            <div className="grid grid-cols-2 gap-3 max-md:grid-cols-1">
              <DialogCloseButton
                disabled={pending}
                data-autofocus
                className={`${buttonClassName("secondary")} w-full`}
              >
                Cancel
              </DialogCloseButton>
              <SubmitButton
                size="md"
                variant={enable ? "primary" : "danger"}
                pendingLabel={enable ? "Enabling" : "Disabling"}
              >
                {enable ? "Enable plan" : "Disable plan"}
              </SubmitButton>
            </div>
          </form>
        </>
      )}
    </Dialog>
  );
}
