import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import ButtonLink from "@/components/ButtonLink";
import EchoPlus from "@/components/EchoPlus";
import CaveShell, { WatchlistSkeleton, type CaveTab } from "@/components/watchlist/CaveShell";
import Watchlist from "@/components/watchlist/Watchlist";
import WatchlistRetry from "@/components/watchlist/WatchlistRetry";
import { getWatchlistAccess } from "@/lib/watchlist/access";
import { getWatchlist } from "@/lib/watchlist/queries";
import { getViewingActivity } from "@/lib/viewing-status/queries";
import ViewingActivity from "@/components/viewing-status/ViewingActivity";

export const metadata: Metadata = { title: "Cave", robots: { index: false, follow: false } };

async function CaveLibrary({ tab }: { tab: CaveTab }) {
  // cookies() in the existing auth utility keeps this content request-specific.
  const access = await getWatchlistAccess();
  if (access.status === "guest") {
    redirect(`/login?next=${encodeURIComponent(tab === "viewing" ? "/cave?tab=viewing" : "/cave")}`);
  }

  if (access.status === "free") {
    return (
      <section className="max-w-xl py-10" aria-labelledby="watchlist-upgrade-title">
        <p className="text-[11px] font-semibold tracking-[0.14em] text-accent uppercase">Included with Echo+</p>
        <h2 id="watchlist-upgrade-title" className="mt-2 text-2xl font-semibold tracking-tight">
          Make more room for what you love.
        </h2>
        <p className="mt-3 text-[0.9375rem] leading-relaxed text-muted">
          <EchoPlus /> unlocks your Watchlist, Viewing Status, Ratings and simulated viewing.
          Save movies and shows for later, and keep your favourites close.
        </p>
        <p className="mt-2 text-sm text-muted">Already saved a few? Your titles stay here for when you subscribe again.</p>
        <ButtonLink href="/plans" className="mt-5">Explore Echo+ plans</ButtonLink>
      </section>
    );
  }

  if (access.status === "error") return <CaveDataError tab={tab} />;
  if (tab === "viewing") {
    const activity = await getViewingActivity();
    return activity.ok ? <ViewingActivity key={access.userId} items={activity.items} /> : <CaveDataError tab={tab} />;
  }

  const result = await getWatchlist();
  if (result.error) return <CaveDataError tab={tab} />;
  return <Watchlist key={access.userId} items={result.items} />;
}

function CaveDataError({ tab }: { tab: CaveTab }) {
  return (
    <section className="py-10">
      <h2 className="text-lg font-semibold tracking-tight">Your {tab === "viewing" ? "viewing activity" : "watchlist"} couldn&apos;t be loaded.</h2>
      <p role="alert" className="mt-2 mb-5 text-sm text-muted">Please try again in a moment. Your library hasn&apos;t been changed.</p>
      <WatchlistRetry />
    </section>
  );
}

export default async function CavePage({ searchParams }: PageProps<"/cave">) {
  const params = await searchParams;
  const tab: CaveTab = params.tab === "viewing" ? "viewing" : "watchlist";
  return (
    <CaveShell tab={tab}>
      <Suspense key={tab} fallback={<WatchlistSkeleton />}>
        <CaveLibrary tab={tab} />
      </Suspense>
    </CaveShell>
  );
}
