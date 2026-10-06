"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Toast from "@/components/forms/Toast";
import type { FormState } from "@/lib/auth/form-state";
import type { FieldError, FormValidator } from "@/lib/auth/validation";

type FieldErrorsOptions = {
  /** Also announce successful submissions with a toast. */
  showSuccess?: boolean;
};

const toastIds = new WeakMap<FormState, number>();
let nextToastId = 0;

function toastKey(state: FormState): number {
  let id = toastIds.get(state);
  if (id === undefined) {
    id = ++nextToastId;
    toastIds.set(state, id);
  }
  return id;
}

/**
 * Validates a form in the browser before it is submitted and routes errors to the right place:
 * field errors pop up next to their input, anything else is shown as a toast.
 */
export function useFieldErrors(
  state: FormState,
  validate: FormValidator,
  { showSuccess = false }: FieldErrorsOptions = {},
) {
  const [clientError, setClientError] = useState<FieldError | null>(null);
  const [dismissedState, setDismissedState] = useState<FormState | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const current = dismissedState !== state ? state : null;
  const serverFieldError =
    current?.status === "error" && current.field && current.message
      ? { field: current.field, message: current.message }
      : null;
  const fieldError = clientError ?? serverFieldError;
  const notice =
    !clientError &&
    current?.message &&
    ((current.status === "error" && !current.field) ||
      (current.status === "success" && showSuccess))
      ? current
      : null;

  useEffect(() => {
    if (state.status === "error" && state.field) focusField(formRef.current, state.field);
  }, [state]);

  function dismiss() {
    setClientError(null);
    setDismissedState(state);
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    const error = validate(new FormData(event.currentTarget));
    if (error) {
      event.preventDefault();
      setClientError(error);
      focusField(event.currentTarget, error.field);
      return;
    }
    setClientError(null);
  }

  function onChange(event: FormEvent<HTMLFormElement>) {
    const { name } = event.target as HTMLInputElement;
    if (name && name === fieldError?.field) dismiss();
  }

  return {
    formProps: { ref: formRef, noValidate: true, onSubmit, onChange },
    errorFor: (field: string) => (fieldError?.field === field ? fieldError.message : undefined),
    toast: notice?.message ? (
      <Toast
        key={toastKey(notice)}
        message={notice.message}
        tone={notice.status === "success" ? "success" : "error"}
        onDismiss={dismiss}
      />
    ) : null,
  };
}

function focusField(form: HTMLFormElement | null, name: string) {
  const element = form?.elements.namedItem(name);
  if (element instanceof HTMLElement) element.focus();
}
