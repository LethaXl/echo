"use client";

import type { ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { buttonClassName, type ButtonSize, type ButtonVariant } from "@/components/ButtonLink";
import { SpinnerIcon } from "@/components/icons";

type SubmitButtonProps = {
  children: ReactNode;
  pendingLabel: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  disabled?: boolean;
};

export default function SubmitButton({
  children,
  pendingLabel,
  variant = "primary",
  size = "lg",
  fullWidth = true,
  disabled = false,
}: SubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending || disabled}
      aria-busy={pending}
      className={`${buttonClassName(variant, size)} ${fullWidth ? "w-full" : "shrink-0"}`}
    >
      {pending && <SpinnerIcon />}
      {pending ? pendingLabel : children}
    </button>
  );
}
