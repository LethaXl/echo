import type { ReactNode } from "react";
import EchoPlus from "@/components/EchoPlus";
import { AlertCircleIcon } from "@/components/icons";
import { formatDate, formatPrice } from "@/lib/format";
import { BILLING_PERIODS, FREE_PLAN_NAME } from "@/lib/subscriptions/plans";
import type { SubscriptionEvent, SubscriptionHistory } from "@/lib/subscriptions/queries";

const HEADING_ID = "subscription-history-heading";

function describe(event: SubscriptionEvent): { title: ReactNode; detail?: ReactNode } {
  const label = BILLING_PERIODS[event.billingInterval].label;
  const previous = event.previousBillingInterval
    ? BILLING_PERIODS[event.previousBillingInterval].label
    : null;
  const plan = (
    <>
      <EchoPlus /> {label}
    </>
  );
  const periodEnd = formatDate(event.periodEnd);

  switch (event.type) {
    case "subscribed":
      return { title: <>Subscribed to {plan}</> };
    case "resubscribed":
      return { title: <>Resubscribed to {plan}</> };
    case "upgraded":
      return { title: `Upgraded from ${previous ?? "Monthly"} to ${label}` };
    case "renewed":
      return { title: <>{plan} renewed</> };
    case "cancellation_scheduled":
      return { title: <>Cancelled {plan}</>, detail: `Access until ${periodEnd}` };
    case "downgrade_scheduled":
      return { title: `Moved to ${FREE_PLAN_NAME} (free)`, detail: `Access until ${periodEnd}` };
    case "switch_scheduled":
      return { title: `Scheduled downgrade to ${label}`, detail: `From ${periodEnd}` };
    case "switch_cancelled":
      return { title: <>Kept {plan}</>, detail: "Downgrade cancelled" };
    case "switched":
      return { title: `Downgraded from ${previous ?? "Annual"} to ${label}` };
    case "reactivated":
      return { title: <>Reactivated {plan}</> };
    case "ended":
      return { title: <>{plan} ended</> };
  }
}

// US-31 View Subscription History
export default function SubscriptionHistory({ history }: { history: SubscriptionHistory }) {
  return (
    <section aria-labelledby={HEADING_ID}>
      <h2 id={HEADING_ID} className="text-sm font-medium text-foreground">
        Subscription history
      </h2>

      {!history.ok ? (
        <p
          role="alert"
          className="mt-3 flex items-start gap-2.5 rounded-md border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger"
        >
          <AlertCircleIcon className="mt-0.5 size-4 shrink-0" />
          We couldn&apos;t load your subscription history. Refresh the page to try again.
        </p>
      ) : history.events.length === 0 ? (
        <p className="mt-3 rounded-md border border-line bg-surface px-5 py-4 text-sm text-muted">
          No subscription activity yet.
        </p>
      ) : (
        <>
          <ol className="mt-3 divide-y divide-line rounded-md border border-line bg-surface">
            {history.events.map((event) => {
              const { title, detail } = describe(event);
              return (
                <li key={event.id} className="flex items-center gap-4 px-5 py-3 text-sm">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-foreground">{title}</p>
                    <p className="mt-0.5 text-xs text-muted">
                      <time dateTime={event.occurredAt}>{formatDate(event.occurredAt)}</time>
                      {detail && <> · {detail}</>}
                    </p>
                  </div>
                  {event.amountCents !== null && (
                    <span className="shrink-0 font-medium text-foreground tabular-nums">
                      {formatPrice(event.amountCents)}
                    </span>
                  )}
                </li>
              );
            })}
          </ol>
          {history.hasMore && (
            <p className="mt-2 text-xs text-muted">
              Showing your {history.events.length} most recent changes.
            </p>
          )}
        </>
      )}
    </section>
  );
}
