"use client";

import { useActionState } from "react";
import { AuthHeader } from "@/components/auth/AuthPage";
import AuthSwitchLink from "@/components/auth/AuthSwitchLink";
import NewPasswordFields from "@/components/auth/NewPasswordFields";
import SignUpSuccess from "@/components/auth/SignUpSuccess";
import SubmitButton from "@/components/forms/SubmitButton";
import TextField from "@/components/forms/TextField";
import { useFieldErrors } from "@/components/forms/useFieldErrors";
import { signUp } from "@/lib/auth/actions";
import { initialFormState } from "@/lib/auth/form-state";
import { MAX_NAME_LENGTH, validateSignUpForm } from "@/lib/auth/validation";

export default function SignUpForm() {
  const [state, formAction] = useActionState(signUp, initialFormState);
  const { formProps, errorFor, toast } = useFieldErrors(state, validateSignUpForm);

  if (state.status === "success") {
    return <SignUpSuccess email={state.values?.email ?? ""} />;
  }

  return (
    <>
      <AuthHeader
        title="Create your account"
        description="Create an account to get started with Echo."
      />
      {toast}
      <form action={formAction} {...formProps} className="flex flex-col gap-3">
        <TextField
          label="Name"
          name="fullName"
          autoComplete="name"
          autoFocus
          placeholder="Your name"
          maxLength={MAX_NAME_LENGTH}
          defaultValue={state.values?.fullName}
          error={errorFor("fullName")}
        />
        <TextField
          label="Email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          defaultValue={state.values?.email}
          error={errorFor("email")}
        />
        <NewPasswordFields errorFor={errorFor} />
        <div className="mt-2 flex flex-col items-center gap-3">
          <SubmitButton pendingLabel="Creating account">Create account</SubmitButton>
          <AuthSwitchLink prompt="Already have an account?" href="/login" label="Log in" />
        </div>
      </form>
    </>
  );
}
