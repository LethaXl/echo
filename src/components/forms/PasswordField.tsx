"use client";

import { useState, type ComponentProps, type ReactNode } from "react";
import FieldErrorPopover, { fieldErrorId } from "@/components/forms/FieldErrorPopover";
import { inputClassName, labelClassName } from "@/components/forms/TextField";
import { EyeIcon, EyeOffIcon } from "@/components/icons";

type PasswordFieldProps = Omit<ComponentProps<"input">, "type" | "children"> & {
  label: string;
  name: string;
  labelAction?: ReactNode;
  adornment?: ReactNode;
  error?: string;
  children?: ReactNode;
};

export default function PasswordField({
  label,
  name,
  labelAction,
  adornment,
  error,
  children,
  ...inputProps
}: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between gap-3 max-md:flex-wrap max-md:gap-x-2 max-md:gap-y-0 max-md:[&_button]:min-h-11 max-md:[&_a]:inline-flex max-md:[&_a]:min-h-11 max-md:[&_a]:items-center">
        <label htmlFor={name} className={labelClassName}>
          {label}
        </label>
        {labelAction}
      </div>
      <div className="relative">
        <input
          id={name}
          name={name}
          type={visible ? "text" : "password"}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? fieldErrorId(name) : undefined}
          className={`${inputClassName} ${adornment ? "pr-16 max-md:pr-18" : "pr-10 max-md:pr-12"}`}
          {...inputProps}
        />
        {error && <FieldErrorPopover key={error} name={name} message={error} />}
        {adornment && (
          <span className="pointer-events-none absolute inset-y-0 right-10 flex items-center max-md:right-12">
            {adornment}
          </span>
        )}
        <button
          type="button"
          onClick={() => setVisible((current) => !current)}
          aria-label={visible ? "Hide password" : "Show password"}
          aria-pressed={visible}
          className="absolute inset-y-0 right-0 flex w-10 items-center justify-center rounded-r-md text-muted transition-colors hover:text-foreground max-md:bottom-auto max-md:h-11 max-md:w-11"
        >
          {visible ? <EyeOffIcon /> : <EyeIcon />}
        </button>
      </div>
      {children}
    </div>
  );
}
