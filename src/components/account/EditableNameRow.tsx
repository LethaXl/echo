"use client";

import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { buttonClassName } from "@/components/ButtonLink";
import TextField from "@/components/forms/TextField";
import { useFieldErrors } from "@/components/forms/useFieldErrors";
import { CheckIcon, SpinnerIcon } from "@/components/icons";
import { updateName } from "@/lib/account/actions";
import type { FormState } from "@/lib/auth/form-state";
import { MAX_NAME_LENGTH, validateNameForm } from "@/lib/auth/validation";

const SAVED_TICK_MS = 1200;

function SaveButton({ saved, disabled }: { saved: boolean; disabled: boolean }) {
  const { pending } = useFormStatus();
  const busy = pending || saved;

  return (
    <button
      type="submit"
      disabled={disabled && !busy}
      aria-disabled={busy || undefined}
      aria-busy={pending}
      aria-label={pending ? "Saving" : saved ? "Saved" : undefined}
      className={`${buttonClassName("primary")} w-20 shrink-0 ${busy ? "pointer-events-none" : ""}`}
    >
      {pending ? (
        <SpinnerIcon />
      ) : saved ? (
        <CheckIcon className="size-4 motion-safe:animate-pop-in" />
      ) : (
        "Save"
      )}
    </button>
  );
}

export default function EditableNameRow({ currentName }: { currentName: string | null }) {
  const [state, formAction] = useActionState(updateName, {
    status: "idle",
    values: { fullName: currentName ?? "" },
  } satisfies FormState);
  const { formProps, errorFor, toast } = useFieldErrors(state, validateNameForm);
  const [editSession, setEditSession] = useState<FormState | null>(null);
  const [name, setName] = useState(currentName ?? "");

  const editing = editSession !== null;
  const saved = editing && state !== editSession && state.status === "success";
  const unchanged = name.trim() === (currentName ?? "");

  useEffect(() => {
    if (!saved) return;
    const timer = setTimeout(() => setEditSession(null), SAVED_TICK_MS);
    return () => clearTimeout(timer);
  }, [saved]);

  function startEditing() {
    setName(currentName ?? "");
    setEditSession(state);
  }

  if (editing) {
    return (
      <div className="grid grid-cols-[8rem_minmax(0,1fr)] items-start gap-4 py-3 max-md:grid-cols-1 max-md:gap-1.5">
        <dt className="pt-2.5 text-muted max-md:pt-0">Name</dt>
        <dd className="max-md:min-w-0">
          {toast}
          <span role="status" className="sr-only">
            {saved ? "Name saved." : ""}
          </span>
          <form action={formAction} {...formProps} className="flex items-start gap-2 max-md:grid max-md:grid-cols-2 max-md:[&>button]:w-full">
            <div className="min-w-0 flex-1 max-md:col-span-2">
              <TextField
                hideLabel
                label="Name"
                name="fullName"
                autoComplete="name"
                autoFocus
                placeholder="Your name"
                maxLength={MAX_NAME_LENGTH}
                readOnly={saved}
                value={name}
                onChange={(event) => setName(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Escape") setEditSession(null);
                }}
                error={errorFor("fullName")}
              />
            </div>
            <SaveButton saved={saved} disabled={unchanged} />
            <button
              type="button"
              onClick={() => setEditSession(null)}
              className={buttonClassName("secondary")}
            >
              Cancel
            </button>
          </form>
        </dd>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-[8rem_minmax(0,1fr)_auto] items-start gap-4 py-4 max-md:grid-cols-[minmax(0,1fr)_auto] max-md:gap-x-3 max-md:gap-y-1.5 max-md:py-3">
      <dt className="text-muted">Name</dt>
      <dd className="min-w-0 break-words text-foreground max-md:col-start-1 max-md:row-start-2 max-md:[overflow-wrap:anywhere]">
        {toast}
        {currentName ?? <span className="text-muted">Not set</span>}
      </dd>
      <dd className="max-md:col-start-2 max-md:row-span-2 max-md:row-start-1 max-md:self-center">
        <button
          type="button"
          onClick={startEditing}
          className="rounded-sm text-sm font-medium text-accent transition-colors hover:text-accent-hover max-md:min-h-11 max-md:min-w-11"
        >
          Edit
        </button>
      </dd>
    </div>
  );
}
