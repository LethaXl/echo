import type { ReactNode } from "react";
import EditableNameRow from "@/components/account/EditableNameRow";
import EchoPlus from "@/components/EchoPlus";
import type { AccountDetails } from "@/lib/account/queries";
import { formatDate } from "@/lib/format";
import { BILLING_PERIODS, FREE_PLAN_NAME } from "@/lib/subscriptions/plans";

type DetailRow = { label: string; value: ReactNode };

function membership({ subscription: lookup }: AccountDetails): ReactNode {
  if (!lookup.ok) return <span className="text-muted">Couldn&apos;t load your plan</span>;

  const { subscription } = lookup;
  if (!subscription) {
    return (
      <>
        <span className="font-medium">{FREE_PLAN_NAME}</span>
        <span className="mt-0.5 block text-muted">No active subscription</span>
      </>
    );
  }

  const periodEnd = formatDate(subscription.currentPeriodEnd);
  const nextPlan = subscription.scheduledPlan;
  const note = {
    cancel: `Cancelled; ends on ${periodEnd}`,
    downgrade: `Moves to ${FREE_PLAN_NAME} on ${periodEnd}`,
    switch_plan: nextPlan
      ? `Downgrades to ${BILLING_PERIODS[nextPlan.billingInterval].label} on ${periodEnd}`
      : `Renews on ${periodEnd}`,
  };

  return (
    <>
      <EchoPlus /> {BILLING_PERIODS[subscription.billingInterval].label}
      <span className="mt-0.5 block text-muted">
        {subscription.scheduledChange
          ? note[subscription.scheduledChange]
          : `Renews on ${periodEnd}`}
      </span>
    </>
  );
}

export default function AccountDetailsList({ details }: { details: AccountDetails }) {
  const rows: DetailRow[] = [
    { label: "Email", value: details.email },
    { label: "Member since", value: formatDate(details.createdAt) },
    { label: "Membership", value: membership(details) },
  ];

  return (
    <dl className="divide-y divide-line rounded-md border border-line bg-surface px-5 text-sm max-md:px-4">
      <EditableNameRow currentName={details.fullName} />
      {rows.map((row) => (
        <div
          key={row.label}
          className="grid grid-cols-[8rem_minmax(0,1fr)_auto] items-start gap-4 py-4 max-md:grid-cols-1 max-md:gap-1.5 max-md:py-3"
        >
          <dt className="text-muted">{row.label}</dt>
          <dd className="min-w-0 break-words text-foreground max-md:[overflow-wrap:anywhere]">{row.value}</dd>
        </div>
      ))}
    </dl>
  );
}
