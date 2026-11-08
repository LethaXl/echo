"use client";

import { useRouter } from "next/navigation";
import { useActionState, useId, useState } from "react";
import { buttonClassName, type ButtonVariant } from "@/components/ButtonLink";
import Dialog, { DialogCloseButton, DialogHeader } from "@/components/Dialog";
import FormMessage from "@/components/forms/FormMessage";
import SubmitButton from "@/components/forms/SubmitButton";
import type { ContentActionState } from "@/lib/admin/content-actions";
import { initialFormState } from "@/lib/auth/form-state";
import { SMALL_BUTTON, SMALL_PRIMARY_BUTTON } from "./styles";

export type ContentAction = (state: ContentActionState, formData: FormData) => Promise<ContentActionState>;

type ConfirmContent = {
  action: ContentAction;
  fields: Record<string, string>;
  title: string;
  description: string;
  confirmLabel: string;
  pendingLabel: string;
  confirmVariant?: ButtonVariant;
  /** The heading once it's done, unless the action returns its own. */
  successTitle: string;
};

type ConfirmActionButtonProps = ConfirmContent & {
  label: string;
  /** Full-size buttons for page actions; rows use the compact styles. */
  buttonStyle?: ButtonVariant | "compact" | "compact-primary";
  className?: string;
  disabled?: boolean;
  /** Runs when the dialog is closed after the action succeeded. Refreshes the page by default. */
  onDone?: () => void;
};

export function triggerClassName(style: ConfirmActionButtonProps["buttonStyle"] = "compact") {
  if (style === "compact") return SMALL_BUTTON;
  if (style === "compact-primary") return SMALL_PRIMARY_BUTTON;
  return buttonClassName(style);
}

/** A button that confirms an admin action in a dialog, then reports what happened. */
export default function ConfirmActionButton({
  label,
  buttonStyle,
  className = "",
  disabled = false,
  onDone,
  ...content
}: ConfirmActionButtonProps) {
  const router = useRouter();
  // Kept as it was when opened, so the dialog keeps describing the action that was confirmed
  // even if the item changes underneath it.
  const [open, setOpen] = useState<ConfirmContent | null>(null);

  function handleClose(succeeded: boolean) {
    setOpen(null);
    if (!succeeded) return;
    if (onDone) onDone();
    else router.refresh();
  }

  return (
    <>
      <button
        type="button"
        aria-haspopup="dialog"
        disabled={disabled}
        onClick={() => setOpen(content)}
        className={`${triggerClassName(buttonStyle)} ${className}`}
      >
        {label}
      </button>
      {open && <ConfirmActionDialog {...open} onClose={handleClose} />}
    </>
  );
}

function ConfirmActionDialog({
  action,
  fields,
  title,
  description,
  confirmLabel,
  pendingLabel,
  confirmVariant = "primary",
  successTitle,
  onClose,
}: ConfirmContent & { onClose: (succeeded: boolean) => void }) {
  const titleId = useId();
  const [state, formAction, pending] = useActionState<ContentActionState, FormData>(action, initialFormState);
  const succeeded = state.status === "success";

  return (
    <Dialog labelledBy={titleId} busy={pending} onClose={() => onClose(succeeded)} mobileOptimized>
      {succeeded ? (
        <div role="status">
          <DialogHeader titleId={titleId} title={state.title ?? successTitle}>
            {state.message}
          </DialogHeader>
          <DialogCloseButton autoFocus className={`${buttonClassName("primary")} mt-6 w-full`}>
            Done
          </DialogCloseButton>
        </div>
      ) : (
        <>
          <DialogHeader titleId={titleId} title={title}>
            {description}
          </DialogHeader>
          <form action={formAction} className="mt-6 flex flex-col gap-4">
            {Object.entries(fields).map(([name, value]) => (
              <input key={name} type="hidden" name={name} value={value} />
            ))}
            {state.status === "error" && <FormMessage state={state} />}
            <div className="grid grid-cols-2 gap-3 max-md:grid-cols-1">
              <DialogCloseButton
                disabled={pending}
                data-autofocus
                className={`${buttonClassName("secondary")} w-full`}
              >
                Cancel
              </DialogCloseButton>
              <SubmitButton size="md" variant={confirmVariant} pendingLabel={pendingLabel}>
                {confirmLabel}
              </SubmitButton>
            </div>
          </form>
        </>
      )}
    </Dialog>
  );
}
