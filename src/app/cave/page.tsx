import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import ButtonLink from "@/components/ButtonLink";
import EchoPlus from "@/components/EchoPlus";
import CaveShell, { WatchlistSkeleton } from "@/components/watchlist/CaveShell";
import Watchlist from "@/components/watchlist/Watchlist";
import WatchlistRetry from "@/components/watchlist/WatchlistRetry";
import { getWatchlistAccess } from "@/lib/watchlist/access";
import { getWatchlist } from "@/lib/watchlist/queries";

export const metadata: Metadata = { title: "Cave", robots: { index: false, follow: false } };

async function CaveWatchlist() {
  // cookies() in the existing auth utility keeps this content request-specific.
  const access = await getWatchlistAccess();
  if (access.status === "guest") {
    redirect("/login?next=%2Fcave");
  }

  if (access.status === "free") {
    return (
      <section className="max-w-xl py-10" aria-labelledby="watchlist-upgrade-title">
        <p className="text-[11px] font-semibold tracking-[0.14em] text-accent uppercase">Included with Echo+</p>
        <h2 id="watchlist-upgrade-title" className="mt-2 text-2xl font-semibold tracking-tight">
          Make more room for what you love.
        </h2>
        <p className="mt-3 text-[0.9375rem] leading-relaxed text-muted">
          <EchoPlus /> unlocks your Watchlist, Ratings and simulated viewing.
          Save movies and shows for later, and keep your favourites close.
        </p>
        <p className="mt-2 text-sm text-muted">Already saved a few? Your titles stay here for when you subscribe again.</p>
        <ButtonLink href="/plans" className="mt-5">Explore Echo+ plans</ButtonLink>
      </section>
    );
  }

  const result = access.status === "error" ? { items: [], error: true } : await getWatchlist();
  if (result.error) {
    return (
      <section className="py-10">
        <h2 className="text-lg font-semibold tracking-tight">Your watchlist couldn&apos;t be loaded.</h2>
        <p role="alert" className="mt-2 mb-5 text-sm text-muted">
          Please try again in a moment. Your saved titles haven&apos;t been changed.
        </p>
        <WatchlistRetry />
      </section>
    );
  }
  return <Watchlist key={access.status === "member" ? access.userId : undefined} items={result.items} />;
}

export default function CavePage() {
  return (
    <CaveShell>
      <Suspense fallback={<WatchlistSkeleton />}>
        <CaveWatchlist />
      </Suspense>
    </CaveShell>
  );
}
