"use client";

import Link from "next/link";
import { useActionState } from "react";
import PasswordField from "@/components/forms/PasswordField";
import SubmitButton from "@/components/forms/SubmitButton";
import TextField from "@/components/forms/TextField";
import { useFieldErrors } from "@/components/forms/useFieldErrors";
import { logIn } from "@/lib/auth/actions";
import { initialFormState } from "@/lib/auth/form-state";
import { validateLogInForm } from "@/lib/auth/validation";

export default function LoginForm() {
  const [state, formAction] = useActionState(logIn, initialFormState);
  const { formProps, errorFor, toast } = useFieldErrors(state, validateLogInForm);

  return (
    <>
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
        <PasswordField
          label="Password"
          name="password"
          autoComplete="current-password"
          placeholder="Your password"
          error={errorFor("password")}
          labelAction={
            <Link
              href="/forgot-password"
              className="rounded-sm text-xs font-medium text-accent transition-colors hover:text-accent-hover"
            >
              Forgot password?
            </Link>
          }
        />
        <div className="mt-2">
          <SubmitButton pendingLabel="Logging in">Log In</SubmitButton>
        </div>
      </form>
    </>
  );
}
