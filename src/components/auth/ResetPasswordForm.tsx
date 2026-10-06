"use client";

import { useActionState } from "react";
import { AuthHeader } from "@/components/auth/AuthPage";
import AuthStatus from "@/components/auth/AuthStatus";
import NewPasswordFields from "@/components/auth/NewPasswordFields";
import ButtonLink from "@/components/ButtonLink";
import SubmitButton from "@/components/forms/SubmitButton";
import { useFieldErrors } from "@/components/forms/useFieldErrors";
import { resetPassword } from "@/lib/auth/actions";
import { initialFormState } from "@/lib/auth/form-state";
import { validateNewPasswordForm } from "@/lib/auth/validation";

export default function ResetPasswordForm({ email }: { email: string }) {
  const [state, formAction] = useActionState(resetPassword, initialFormState);
  const { formProps, errorFor, toast } = useFieldErrors(state, validateNewPasswordForm);

  if (state.status === "success") {
    return (
      <AuthStatus
        title="Password updated"
        action={
          <ButtonLink href="/" size="lg" className="w-full">
            Continue to Echo
          </ButtonLink>
        }
      >
        Your password has been reset and you&apos;re signed in.
      </AuthStatus>
    );
  }

  return (
    <>
      <AuthHeader
        title="Choose a new password"
        description={
          <>
            For <span className="font-medium text-foreground">{email}</span>
          </>
        }
      />
      {toast}
      <form action={formAction} {...formProps} className="flex flex-col gap-3">
        <NewPasswordFields
          errorFor={errorFor}
          passwordLabel="New password"
          confirmLabel="Confirm new password"
          autoFocus
        />
        <div className="mt-2">
          <SubmitButton pendingLabel="Saving">Reset password</SubmitButton>
        </div>
      </form>
    </>
  );
}
