import type { ReactNode } from "react";
import { CheckIcon } from "@/components/icons";

type PlanCardProps = {
  name: ReactNode;
  /** Shown opposite the name, e.g. the billing switch. */
  aside?: ReactNode;
  price: ReactNode;
  description: ReactNode;
  features: ReactNode;
  action: ReactNode;
  highlighted?: boolean;
};

export default function PlanCard({
  name,
  aside,
  price,
  description,
  features,
  action,
  highlighted = false,
}: PlanCardProps) {
  return (
    <article
      className={`flex flex-col rounded-md border bg-surface px-7 py-5 ${
        highlighted ? "border-accent/40" : "border-line"
      }`}
    >
      <div className="flex min-h-8 items-center justify-between gap-4">
        <h2 className="text-lg font-semibold tracking-tight">{name}</h2>
        {aside}
      </div>
      <div className="mt-3">{price}</div>
      <p className="mt-1.5 text-sm text-muted">{description}</p>
      <div className="mt-4 border-t border-line pt-4">{features}</div>
      <div className="mt-auto pt-5">{action}</div>
    </article>
  );
}

export function PlanPrice({
  amount,
  period,
  note,
}: {
  amount: string;
  period?: string;
  note?: ReactNode;
}) {
  return (
    <p className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
      <span className="text-[2.25rem] leading-none font-semibold tracking-tight tabular-nums">
        {amount}
      </span>
      {period && <span className="text-sm text-muted">/ {period}</span>}
      {note}
    </p>
  );
}

export function FeatureItem({ included, children }: { included: boolean; children: ReactNode }) {
  return (
    <li className={`flex items-center gap-2.5 ${included ? "text-foreground/90" : "text-muted"}`}>
      {included ? (
        <CheckIcon className="size-4 shrink-0 text-accent" />
      ) : (
        <span aria-hidden="true" className="flex w-4 shrink-0 justify-center text-muted/75">
          —
        </span>
      )}
      {children}
      {!included && <span className="sr-only">(not included)</span>}
    </li>
  );
}

/** A non-interactive stand-in for a plan's button, e.g. "Current plan". */
export function PlanStatus({ children }: { children: ReactNode }) {
  return (
    <p className="flex h-10 items-center justify-center gap-2 rounded-md bg-background/60 text-sm font-medium text-foreground/80">
      {children}
    </p>
  );
}

export function CurrentPlanStatus() {
  return (
    <PlanStatus>
      <CheckIcon className="size-4 text-accent" />
      Current plan
    </PlanStatus>
  );
}
