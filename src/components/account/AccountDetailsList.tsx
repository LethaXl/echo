import type { ReactNode } from "react";
import EditableNameRow from "@/components/account/EditableNameRow";
import EchoPlus from "@/components/EchoPlus";
import type { AccountDetails } from "@/lib/account/queries";
import { APP_NAME } from "@/lib/brand";
import { formatDate } from "@/lib/format";

type DetailRow = { label: string; value: ReactNode };

export default function AccountDetailsList({ details }: { details: AccountDetails }) {
  const { subscription } = details;

  const rows: DetailRow[] = [
    { label: "Email", value: details.email },
    { label: "Member since", value: formatDate(details.createdAt) },
    {
      label: "Membership",
      value: subscription ? (
        <>
          <EchoPlus />
          <span className="mt-0.5 block text-muted">
            {subscription.planName} · Active until {formatDate(subscription.currentPeriodEnd)}
          </span>
        </>
      ) : (
        <>
          <span className="font-medium">{APP_NAME}</span>
          <span className="mt-0.5 block text-muted">No active subscription</span>
        </>
      ),
    },
  ];

  return (
    <dl className="divide-y divide-line rounded-md border border-line bg-surface px-5 text-sm">
      <EditableNameRow currentName={details.fullName} />
      {rows.map((row) => (
        <div
          key={row.label}
          className="grid grid-cols-[8rem_minmax(0,1fr)_auto] items-start gap-4 py-4"
        >
          <dt className="text-muted">{row.label}</dt>
          <dd className="min-w-0 break-words text-foreground">{row.value}</dd>
        </div>
      ))}
    </dl>
  );
}
