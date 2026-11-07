"use client";

import { useRouter } from "next/navigation";
import { useActionState, useId, useState, type FormEvent } from "react";
import { buttonClassName, type ButtonVariant } from "@/components/ButtonLink";
import Dialog, { DialogCloseButton, DialogHeader, useDialogClose } from "@/components/Dialog";
import TmdbImage from "@/components/details/TmdbImage";
import FormMessage from "@/components/forms/FormMessage";
import SubmitButton from "@/components/forms/SubmitButton";
import { inputClassName, labelClassName } from "@/components/forms/TextField";
import type { ContentActionState } from "@/lib/admin/content-actions";
import type { FormState } from "@/lib/auth/form-state";
import { initialFormState } from "@/lib/auth/form-state";
import {
  FIELD_SECTIONS,
  imagePath,
  parseField,
  type FieldKind,
  type FieldSection,
} from "@/lib/content/overrides";
import { triggerClassName, type ContentAction } from "./ConfirmActionButton";

export type EditField = {
  key: string;
  label: string;
  kind: FieldKind;
  section: FieldSection;
  max: number;
  required?: boolean;
  /** TMDB's value, as it appears in the field. */
  tmdbValue: string;
  /** What Echo shows now: the admin's value if there is one, otherwise TMDB's. */
  value: string;
};

type EditContentButtonProps = {
  label?: string;
  /** Full-size buttons for page actions; rows use the compact style. */
  buttonStyle?: ButtonVariant | "compact";
  disabled?: boolean;
  title: string;
  fields: EditField[];
  /** Identifies the content, e.g. media type and TMDB ID. */
  hiddenFields: Record<string, string>;
  action: ContentAction;
  /** Runs when the dialog is closed after saving. Refreshes the page by default. */
  onDone?: () => void;
};

// US-52 Edit Content Details, US-56 Edit Episode Details
export default function EditContentButton({
  label = "Edit",
  buttonStyle = "compact",
  disabled = false,
  onDone,
  ...dialog
}: EditContentButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  function handleClose(saved: boolean) {
    setOpen(false);
    if (!saved) return;
    if (onDone) onDone();
    else router.refresh();
  }

  return (
    <>
      <button
        type="button"
        aria-haspopup="dialog"
        disabled={disabled}
        onClick={() => setOpen(true)}
        className={triggerClassName(buttonStyle)}
      >
        {label}
      </button>
      {open && <EditContentDialog {...dialog} onClose={handleClose} />}
    </>
  );
}

const HINTS: Partial<Record<FieldKind, string>> = {
  list: "Separate with commas.",
  image: "A TMDB image path such as /abc123.jpg, or a TMDB image link.",
};

type FieldError = { field: string; message: string };

function EditContentDialog({
  title,
  fields,
  hiddenFields,
  action,
  onClose,
}: Omit<EditContentButtonProps, "label" | "buttonStyle" | "disabled" | "onDone"> & {
  onClose: (saved: boolean) => void;
}) {
  const titleId = useId();
  const [state, formAction, pending] = useActionState<ContentActionState, FormData>(action, initialFormState);
  const [initial] = useState(() => Object.fromEntries(fields.map((field) => [field.key, field.value])));
  const [values, setValues] = useState(initial);
  const sections = FIELD_SECTIONS.filter((section) => fields.some((field) => field.section === section.key));
  const [active, setActive] = useState<FieldSection>(sections[0]?.key ?? "general");
  const [clientError, setClientError] = useState<FieldError | null>(null);
  const [dismissedState, setDismissedState] = useState<FormState | null>(null);
  const [confirmingDiscard, setConfirmingDiscard] = useState(false);
  const saved = state.status === "success";
  const dirty = fields.some((field) => values[field.key] !== initial[field.key]);

  // A field error from the server opens that field's tab.
  const [seenState, setSeenState] = useState(state);
  if (state !== seenState) {
    setSeenState(state);
    const section = fields.find((field) => field.key === state.field)?.section;
    if (state.status === "error" && section) setActive(section);
  }

  const serverError: FieldError | null =
    state.status === "error" && state.field && state !== dismissedState
      ? { field: state.field, message: state.message ?? "" }
      : null;
  const fieldError = clientError ?? serverError;
  const formError = state.status === "error" && !state.field ? state : null;

  function canClose() {
    if (saved || !dirty) return true;
    setConfirmingDiscard(true);
    return false;
  }

  function setValue(key: string, value: string) {
    setValues((current) => ({ ...current, [key]: value }));
    if (fieldError?.field === key) {
      setClientError(null);
      setDismissedState(state);
    }
  }

  function validate(event: FormEvent<HTMLFormElement>) {
    setConfirmingDiscard(false);
    for (const field of fields) {
      const value = values[field.key] ?? "";
      if (value.trim() === field.tmdbValue.trim()) continue;
      const parsed = parseField(field, value);
      if (!parsed.ok) {
        event.preventDefault();
        setClientError({ field: field.key, message: parsed.message });
        setActive(field.section);
        return;
      }
    }
    setClientError(null);
  }

  return (
    <Dialog
      labelledBy={titleId}
      busy={pending}
      canClose={canClose}
      size="panel"
      onClose={() => onClose(saved)}
    >
      {saved ? (
        <div role="status" className="p-6">
          <DialogHeader titleId={titleId} title={state.title ?? "Changes saved"}>
            {state.message}
          </DialogHeader>
          <DialogCloseButton autoFocus className={`${buttonClassName("primary")} mt-6 w-full`}>
            Done
          </DialogCloseButton>
        </div>
      ) : (
        <form action={formAction} onSubmit={validate} noValidate className="flex min-h-0 flex-1 flex-col">
          {Object.entries(hiddenFields).map(([name, value]) => (
            <input key={name} type="hidden" name={name} value={value} />
          ))}

          <div className="border-b border-line px-6 pt-5">
            <h2 id={titleId} className="truncate text-lg font-semibold tracking-tight">
              {title}
            </h2>
            <p className="mt-0.5 text-sm text-muted">Fields you don&apos;t change keep following TMDB.</p>
            {sections.length > 1 && (
              <div role="tablist" aria-label="Sections" className="mt-4 flex gap-6 text-sm">
                {sections.map((section) => {
                  const sectionFields = fields.filter((field) => field.section === section.key);
                  const edited = sectionFields.some((field) => values[field.key] !== field.tmdbValue);
                  const invalid = sectionFields.some((field) => field.key === fieldError?.field);
                  const selected = active === section.key;
                  return (
                    <button
                      key={section.key}
                      type="button"
                      role="tab"
                      id={`${titleId}-tab-${section.key}`}
                      aria-selected={selected}
                      aria-controls={`${titleId}-panel-${section.key}`}
                      onClick={() => setActive(section.key)}
                      className={`-mb-px flex h-10 items-center gap-2 border-b-2 transition-colors duration-150 ${
                        selected
                          ? "border-accent font-semibold text-foreground"
                          : "border-transparent font-medium text-muted hover:text-foreground"
                      }`}
                    >
                      {section.label}
                      {(invalid || edited) && (
                        <>
                          <span
                            aria-hidden="true"
                            className={`size-1.5 rounded-full ${invalid ? "bg-danger" : "bg-accent"}`}
                          />
                          <span className="sr-only">{invalid ? "(has an error)" : "(edited)"}</span>
                        </>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="h-[min(23rem,calc(100dvh-15rem))] overflow-y-auto px-6 py-5">
            {sections.map((section) => (
              <div
                key={section.key}
                role="tabpanel"
                id={`${titleId}-panel-${section.key}`}
                aria-labelledby={`${titleId}-tab-${section.key}`}
                hidden={active !== section.key}
                className="flex flex-col gap-5"
              >
                {fields
                  .filter((field) => field.section === section.key)
                  .map((field) => (
                    <FieldInput
                      key={field.key}
                      id={`${titleId}-${field.key}`}
                      field={field}
                      value={values[field.key] ?? ""}
                      error={fieldError?.field === field.key ? fieldError.message : null}
                      onChange={(value) => setValue(field.key, value)}
                    />
                  ))}
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-3 border-t border-line px-6 py-4">
            {formError && <FormMessage state={formError} />}
            {confirmingDiscard ? (
              <DiscardPrompt onKeepEditing={() => setConfirmingDiscard(false)} />
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <DialogCloseButton disabled={pending} className={`${buttonClassName("secondary")} w-full`}>
                  Cancel
                </DialogCloseButton>
                <SubmitButton size="md" pendingLabel="Saving" disabled={!dirty}>
                  Save changes
                </SubmitButton>
              </div>
            )}
          </div>
        </form>
      )}
    </Dialog>
  );
}

const truncate = (text: string) => (text.length > 90 ? `${text.slice(0, 90).trimEnd()}…` : text);

function FieldInput({
  id,
  field,
  value,
  error,
  onChange,
}: {
  id: string;
  field: EditField;
  value: string;
  error: string | null;
  onChange: (value: string) => void;
}) {
  const edited = value.trim() !== field.tmdbValue.trim();
  const inputProps = {
    id,
    name: `field.${field.key}`,
    value,
    autoComplete: "off",
    "aria-invalid": error ? true : undefined,
    "aria-describedby": `${id}-hint`,
  };

  const input =
    field.kind === "textarea" ? (
      <textarea
        {...inputProps}
        rows={6}
        maxLength={field.max}
        onChange={(event) => onChange(event.target.value)}
        className={`${inputClassName} h-auto resize-none py-2 leading-relaxed`}
      />
    ) : (
      <input
        {...inputProps}
        type={field.kind === "date" ? "date" : "text"}
        maxLength={field.kind === "list" ? undefined : field.kind === "image" ? 300 : field.max}
        spellCheck={field.kind === "image" ? false : undefined}
        onChange={(event) => onChange(event.target.value)}
        className={`${inputClassName} ${field.kind === "date" ? "max-w-48 [color-scheme:dark]" : ""}`}
      />
    );

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex min-h-5 items-center justify-between gap-3">
        <label htmlFor={id} className={labelClassName}>
          {field.label}
          {edited && <span className="ml-2 text-xs font-normal text-accent">Edited</span>}
        </label>
        {edited && (
          <button
            type="button"
            onClick={() => onChange(field.tmdbValue)}
            className="text-xs text-muted transition-colors duration-150 hover:text-foreground"
          >
            Reset to TMDB
          </button>
        )}
      </div>
      {field.kind === "image" ? (
        <div className="flex items-start gap-3">
          <ImagePreview path={imagePath(value)} wide={field.key !== "posterPath"} />
          <div className="min-w-0 flex-1">{input}</div>
        </div>
      ) : (
        input
      )}
      <p id={`${id}-hint`} className={`text-xs ${error ? "text-danger" : "text-muted"}`}>
        {error ??
          (edited ? (
            <>TMDB: {field.tmdbValue.trim() ? truncate(field.tmdbValue) : "None"}</>
          ) : (
            (HINTS[field.kind] ?? (field.required ? "Required." : "Leave empty to show nothing."))
          ))}
      </p>
    </div>
  );
}

function ImagePreview({ path, wide }: { path: string | null; wide: boolean }) {
  return (
    <TmdbImage
      path={path}
      size={wide ? "w300" : "w185"}
      sizes={wide ? "7rem" : "3rem"}
      className={`shrink-0 ring-1 ring-line ${wide ? "aspect-video w-28" : "aspect-[2/3] w-12"}`}
      fallback={<span className="px-1 text-center text-[10px] leading-tight">No image</span>}
    />
  );
}

function DiscardPrompt({ onKeepEditing }: { onKeepEditing: () => void }) {
  const close = useDialogClose();
  return (
    <div role="alert" className="flex flex-col gap-3">
      <p className="text-center text-sm">Discard your unsaved changes?</p>
      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          autoFocus
          onClick={onKeepEditing}
          className={`${buttonClassName("secondary")} w-full`}
        >
          Keep editing
        </button>
        <button type="button" onClick={() => close(true)} className={`${buttonClassName("danger")} w-full`}>
          Discard
        </button>
      </div>
    </div>
  );
}
