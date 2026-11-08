import type { ComponentProps } from "react";
import FieldErrorPopover, { fieldErrorId } from "@/components/forms/FieldErrorPopover";

export const labelClassName = "text-sm font-medium text-foreground/90";

export const inputClassName =
  "h-10 w-full rounded-md border border-line bg-surface px-3 text-sm text-foreground transition-colors placeholder:text-muted/60 hover:border-muted/40 focus:border-accent/70 focus:outline-none aria-invalid:border-danger/70 aria-invalid:focus:border-danger autofill:shadow-[inset_0_0_0_100px_var(--color-surface)] autofill:[-webkit-text-fill-color:var(--color-foreground)] max-md:h-11 max-md:min-w-0 max-md:scroll-my-6 max-md:text-base";

type TextFieldProps = ComponentProps<"input"> & {
  label: string;
  name: string;
  hint?: string;
  error?: string;
  hideLabel?: boolean;
};

export default function TextField({
  label,
  name,
  hint,
  error,
  hideLabel = false,
  ...inputProps
}: TextFieldProps) {
  const hintId = hint ? `${name}-hint` : undefined;
  const describedBy = [hintId, error && fieldErrorId(name)].filter(Boolean).join(" ") || undefined;

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={name} className={hideLabel ? "sr-only" : labelClassName}>
        {label}
      </label>
      <div className="relative">
        <input
          id={name}
          name={name}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={inputClassName}
          {...inputProps}
        />
        {error && <FieldErrorPopover key={error} name={name} message={error} />}
      </div>
      {hint && (
        <p id={hintId} className="text-xs text-muted">
          {hint}
        </p>
      )}
    </div>
  );
}
