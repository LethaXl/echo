import Link from "next/link";
import type { ComponentProps } from "react";

export type ButtonVariant = "primary" | "secondary" | "premium" | "danger";

const variantClassNames: Record<ButtonVariant, string> = {
  primary: "bg-accent text-on-accent hover:bg-accent-hover",
  secondary: "border border-line text-foreground hover:bg-elevated",
  premium: "bg-premium text-on-premium hover:opacity-90",
  danger: "border border-danger/50 text-danger hover:bg-danger/10",
};

export type ButtonSize = "md" | "lg";

const sizeClassNames: Record<ButtonSize, string> = {
  md: "h-10 px-4 font-medium",
  lg: "h-11 px-6 font-semibold",
};

export function buttonClassName(
  variant: ButtonVariant = "primary",
  size: ButtonSize = "md",
): string {
  return `inline-flex items-center justify-center gap-2 rounded-md text-sm transition active:translate-y-px disabled:pointer-events-none disabled:opacity-60 ${sizeClassNames[size]} ${variantClassNames[variant]}`;
}

type ButtonLinkProps = ComponentProps<typeof Link> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
};

export default function ButtonLink({
  variant = "primary",
  size = "md",
  className = "",
  ...props
}: ButtonLinkProps) {
  return (
    <Link className={`${buttonClassName(variant, size)} ${className}`} {...props} />
  );
}
