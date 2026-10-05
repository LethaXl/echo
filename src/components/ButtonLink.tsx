import Link from "next/link";
import type { ComponentProps } from "react";

export type ButtonVariant = "primary" | "secondary" | "premium";

const variantClassNames: Record<ButtonVariant, string> = {
  primary: "bg-accent text-on-accent hover:bg-accent-hover",
  secondary: "border border-line text-foreground hover:bg-elevated",
  premium: "bg-premium text-on-premium hover:opacity-90",
};

export function buttonClassName(variant: ButtonVariant = "primary"): string {
  return `inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${variantClassNames[variant]}`;
}

type ButtonLinkProps = ComponentProps<typeof Link> & {
  variant?: ButtonVariant;
};

export default function ButtonLink({
  variant = "primary",
  className = "",
  ...props
}: ButtonLinkProps) {
  return (
    <Link className={`${buttonClassName(variant)} ${className}`} {...props} />
  );
}
