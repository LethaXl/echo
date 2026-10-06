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
      <div className="grid grid-cols-[8rem_minmax(0,1fr)] items-start gap-4 py-3">
        <dt className="pt-2.5 text-muted">Name</dt>
        <dd>
          {toast}
          <span role="status" className="sr-only">
            {saved ? "Name saved." : ""}
          </span>
          <form action={formAction} {...formProps} className="flex items-start gap-2">
            <div className="min-w-0 flex-1">
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
    <div className="grid grid-cols-[8rem_minmax(0,1fr)_auto] items-start gap-4 py-4">
      <dt className="text-muted">Name</dt>
      <dd className="min-w-0 break-words text-foreground">
        {toast}
        {currentName ?? <span className="text-muted">Not set</span>}
      </dd>
      <dd>
        <button
          type="button"
          onClick={startEditing}
          className="rounded-sm text-sm font-medium text-accent transition-colors hover:text-accent-hover"
        >
          Edit
        </button>
      </dd>
    </div>
  );
}
