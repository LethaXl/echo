import type { ReactNode } from "react";
import PageHeader from "@/components/PageHeader";
import BrowseResultsSkeleton from "@/components/media/BrowseResultsSkeleton";

export function WatchlistSkeleton() {
  return (
    <div className="pt-4">
      <BrowseResultsSkeleton count={7} />
    </div>
  );
}

/** No auth or network work here: the shell also serves as the prefetched loading UI. */
export default function CaveShell({ children }: { children: ReactNode }) {
  return (
    <div data-layout="wide" className="pt-2 pb-8">
      <PageHeader
        eyebrow="Cave"
        title="A place to call your own."
        description="Your watchlist, your ratings and everything worth revisiting."
      />
      <nav aria-label="Cave sections" className="mt-6 flex flex-wrap items-center gap-x-7 border-b border-line text-[15px]">
        <a href="#watchlist" aria-current="location" className="flex h-11 items-center gap-2 border-b-2 border-accent font-semibold text-foreground">
          <span aria-hidden="true" className="size-1.5 rounded-full bg-accent" />
          Watchlist
        </a>
        {["Viewing Status", "My Ratings"].map((label) => (
          <span key={label} aria-disabled="true" className="flex h-11 items-center font-medium text-muted">
            {label}
          </span>
        ))}
      </nav>
      <div id="watchlist" className="scroll-mt-6">{children}</div>
    </div>
  );
}
