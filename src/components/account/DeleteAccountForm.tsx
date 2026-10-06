"use client";

import { useActionState } from "react";
import FieldErrorPopover, { fieldErrorId } from "@/components/forms/FieldErrorPopover";
import PasswordField from "@/components/forms/PasswordField";
import SubmitButton from "@/components/forms/SubmitButton";
import { useFieldErrors } from "@/components/forms/useFieldErrors";
import { deleteAccount } from "@/lib/account/actions";
import { initialFormState } from "@/lib/auth/form-state";
import { validateDeleteAccountForm } from "@/lib/auth/validation";

export default function DeleteAccountForm() {
  const [state, formAction] = useActionState(deleteAccount, initialFormState);
  const { formProps, errorFor, toast } = useFieldErrors(state, validateDeleteAccountForm);
  const confirmError = errorFor("confirm");

  return (
    <div className="rounded-md border border-line bg-surface p-5">
      {toast}
      <h2 className="text-base font-semibold">Delete account</h2>
      <p className="mt-1.5 text-sm leading-relaxed text-muted">
        Your profile, watchlist, ratings, viewing history and subscription will be permanently
        removed.
      </p>
      <form action={formAction} {...formProps} className="mt-5 flex flex-col gap-4">
        <PasswordField
          label="Password"
          name="password"
          autoComplete="current-password"
          placeholder="Enter your password"
          error={errorFor("password")}
        />
        <div className="relative">
          <label className="flex items-center gap-2.5 text-sm text-muted">
            <input
              type="checkbox"
              name="confirm"
              aria-invalid={confirmError ? true : undefined}
              aria-describedby={confirmError ? fieldErrorId("confirm") : undefined}
              className="size-4 shrink-0 accent-danger"
            />
            I understand this cannot be undone.
          </label>
          {confirmError && <FieldErrorPopover key={confirmError} name="confirm" message={confirmError} />}
        </div>
        <div className="mt-1 flex justify-center">
          <SubmitButton variant="danger" fullWidth={false} pendingLabel="Deleting">
            Delete account
          </SubmitButton>
        </div>
      </form>
    </div>
  );
}
