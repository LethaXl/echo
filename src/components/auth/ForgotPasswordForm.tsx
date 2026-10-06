"use client";

import { useActionState, useState } from "react";
import { AuthHeader } from "@/components/auth/AuthPage";
import AuthStatus from "@/components/auth/AuthStatus";
import BackLink from "@/components/auth/BackLink";
import SubmitButton from "@/components/forms/SubmitButton";
import TextField from "@/components/forms/TextField";
import { useFieldErrors } from "@/components/forms/useFieldErrors";
import { requestPasswordReset } from "@/lib/auth/actions";
import { initialFormState } from "@/lib/auth/form-state";
import { validateEmailForm } from "@/lib/auth/validation";

export default function ForgotPasswordForm() {
  const [attempt, setAttempt] = useState(0);

  return <ForgotPasswordStep key={attempt} onRetry={() => setAttempt((count) => count + 1)} />;
}

function ForgotPasswordStep({ onRetry }: { onRetry: () => void }) {
  const [state, formAction] = useActionState(requestPasswordReset, initialFormState);
  const { formProps, errorFor, toast } = useFieldErrors(state, validateEmailForm);

  if (state.status === "success") {
    return (
      <AuthStatus
        title="Check your inbox"
        action={<BackLink href="/login" label="Back to log in" />}
        note={
          <>
            Didn&apos;t get it? Check your spam folder or{" "}
            <button
              type="button"
              onClick={onRetry}
              className="rounded-sm font-medium text-accent transition-colors hover:text-accent-hover"
            >
              try a different email
            </button>
            .
          </>
        }
      >
        If an account exists for{" "}
        <span className="font-medium text-foreground">{state.values?.email}</span>, we sent a link
        to reset your password.
      </AuthStatus>
    );
  }

  return (
    <>
      <AuthHeader
        title="Reset your password"
        description="Enter your account email and we'll send you a link to choose a new password."
      />
      {toast}
      <form action={formAction} {...formProps} className="flex flex-col gap-3">
        <TextField
          label="Email"
          name="email"
          type="email"
          autoComplete="email"
          autoFocus
          placeholder="you@example.com"
          defaultValue={state.values?.email}
          error={errorFor("email")}
        />
        <div className="mt-2 flex flex-col gap-3">
          <SubmitButton pendingLabel="Sending link">Send reset link</SubmitButton>
          <BackLink href="/login" label="Back to log in" />
        </div>
      </form>
    </>
  );
}
