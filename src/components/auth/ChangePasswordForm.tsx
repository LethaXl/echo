"use client";

import { useActionState } from "react";
import NewPasswordFields from "@/components/auth/NewPasswordFields";
import PasswordField from "@/components/forms/PasswordField";
import SubmitButton from "@/components/forms/SubmitButton";
import { useFieldErrors } from "@/components/forms/useFieldErrors";
import { changePassword } from "@/lib/auth/actions";
import { initialFormState } from "@/lib/auth/form-state";
import { validateChangePasswordForm } from "@/lib/auth/validation";

export default function ChangePasswordForm() {
  const [state, formAction] = useActionState(changePassword, initialFormState);
  const { formProps, errorFor, toast } = useFieldErrors(state, validateChangePasswordForm, {
    showSuccess: true,
  });

  return (
    <div className="rounded-md border border-line bg-surface p-5 max-md:p-4">
      {toast}
      <form action={formAction} {...formProps} className="flex flex-col gap-3">
        <PasswordField
          label="Current password"
          name="currentPassword"
          autoComplete="current-password"
          placeholder="Your current password"
          error={errorFor("currentPassword")}
        />
        <NewPasswordFields
          errorFor={errorFor}
          passwordName="newPassword"
          passwordLabel="New password"
          confirmLabel="Confirm new password"
        />
        <div className="mt-1 flex justify-center">
          <SubmitButton fullWidth={false} pendingLabel="Saving">
            Change password
          </SubmitButton>
        </div>
      </form>
    </div>
  );
}
