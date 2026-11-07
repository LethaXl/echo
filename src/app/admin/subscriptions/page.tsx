import type { Metadata } from "next";
import { Suspense } from "react";
import DetailsBackLink from "@/components/details/DetailsBackLink";
import { requireAdmin } from "@/lib/admin/access";
import { getSubscriptionStats } from "@/lib/admin/subscription-stats";

export const metadata: Metadata = {
  title: "Subscription Overview",
  robots: { index: false, follow: false },
};

const CARD = "rounded-xl border border-line bg-surface";

// US-66 View Subscription Overview
export default async function AdminSubscriptionsPage() {
  await requireAdmin("/admin/subscriptions");

  return (
    <div data-layout="wide" className="motion-safe:animate-fade-in-up">
      <div className="mx-auto w-full max-w-3xl">
        <DetailsBackLink href="/admin" label="Back to Admin Panel" />
        <h1 className="mt-5 text-2xl font-semibold tracking-tight">Subscription Overview</h1>
        <p className="mt-1.5 text-sm text-muted">A snapshot of Echo&apos;s members and subscriptions.</p>
        {/* Inside the page rather than a loading.tsx, so non-admins still get a real 404. */}
        <Suspense fallback={<StatsSkeleton />}>
          <Stats />
        </Suspense>
      </div>
    </div>
  );
}

const formatCount = (value: number) => value.toLocaleString("en-US");
const percentOf = (value: number, total: number) => (total > 0 ? (value / total) * 100 : 0);

async function Stats() {
  const stats = await getSubscriptionStats();

  if (!stats) {
    return (
      <p
        role="alert"
        className="mt-8 rounded-xl border border-danger/30 bg-danger/10 px-6 py-5 text-center text-sm text-danger"
      >
        Subscription statistics couldn&apos;t be loaded right now. Refresh the page to try again.
      </p>
    );
  }

  const segments = [
    { label: "Free Users", value: stats.freeUsers, color: "bg-muted/40" },
    { label: "Echo+ Monthly", value: stats.monthly, color: "bg-accent/55" },
    { label: "Echo+ Annual", value: stats.annual, color: "bg-accent" },
  ].map((segment) => ({ ...segment, percent: percentOf(segment.value, stats.totalUsers) }));

  return (
    <div className="mt-8 flex flex-col gap-4">
      <dl className="grid gap-4 sm:grid-cols-2">
        <SummaryCard label="Total Users" value={stats.totalUsers} />
        <SummaryCard
          label="Total Echo+ Subscribers"
          value={stats.echoPlus}
          note={`${Math.round(percentOf(stats.echoPlus, stats.totalUsers))}% of users`}
          highlighted
        />
      </dl>

      <section aria-labelledby="distribution-heading" className={`${CARD} px-7 py-6`}>
        <h2 id="distribution-heading" className="text-[1.0625rem] font-semibold tracking-tight">
          Membership Distribution
        </h2>

        <div
          role="img"
          aria-label={segments
            .map((segment) => `${segment.label} ${Math.round(segment.percent)}%`)
            .join(", ")}
          className="mt-5 flex h-3 overflow-hidden rounded-full bg-background"
        >
          {segments.map(
            (segment) =>
              segment.value > 0 && (
                <div
                  key={segment.label}
                  className={segment.color}
                  style={{ width: `${segment.percent}%` }}
                />
              ),
          )}
        </div>

        <dl className="mt-6 grid gap-4 border-t border-line pt-5 sm:grid-cols-3">
          {segments.map((segment) => (
            <div key={segment.label}>
              <dt className="flex items-center gap-2 text-sm text-muted">
                <span aria-hidden="true" className={`size-2.5 shrink-0 rounded-full ${segment.color}`} />
                {segment.label}
              </dt>
              <dd className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl leading-none font-semibold tracking-tight tabular-nums">
                  {formatCount(segment.value)}
                </span>
                <span className="text-sm text-muted tabular-nums">
                  {Math.round(segment.percent)}%
                </span>
              </dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  note,
  highlighted = false,
}: {
  label: string;
  value: number;
  note?: string;
  highlighted?: boolean;
}) {
  return (
    <div className={`${CARD} px-7 py-6 ${highlighted ? "border-accent/40" : ""}`}>
      <dt className="text-sm text-muted">{label}</dt>
      <dd className="mt-3 flex items-baseline gap-3">
        <span className="text-[2.75rem] leading-none font-semibold tracking-tight tabular-nums">
          {formatCount(value)}
        </span>
        {note && <span className="text-sm text-accent">{note}</span>}
      </dd>
    </div>
  );
}

function StatsSkeleton() {
  return (
    <div role="status" aria-label="Loading statistics" className="mt-8 flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        {[0, 1].map((index) => (
          <div key={index} className={`${CARD} px-7 py-6`}>
            <div className="h-4 w-28 animate-pulse rounded bg-elevated" />
            <div className="mt-4 h-10 w-20 animate-pulse rounded bg-elevated" />
          </div>
        ))}
      </div>
      <div className={`${CARD} px-7 py-6`}>
        <div className="h-5 w-48 animate-pulse rounded bg-elevated" />
        <div className="mt-5 h-3 animate-pulse rounded-full bg-elevated" />
        <div className="mt-6 grid gap-4 border-t border-line pt-5 sm:grid-cols-3">
          {[0, 1, 2].map((index) => (
            <div key={index}>
              <div className="h-4 w-24 animate-pulse rounded bg-elevated" />
              <div className="mt-3 h-6 w-14 animate-pulse rounded bg-elevated" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
