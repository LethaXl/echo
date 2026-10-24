import type { ReactNode } from "react";
import Link from "next/link";
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
export type CaveTab = "watchlist" | "viewing";

export default function CaveShell({ children, tab = "watchlist" }: { children: ReactNode; tab?: CaveTab }) {
  return (
    <div data-layout="wide" className="pt-2 pb-8">
      <PageHeader
        eyebrow="Cave"
        title="A place to call your own."
        description="Your watchlist, your ratings and everything worth revisiting."
      />
      <nav aria-label="Cave sections" className="mt-6 flex flex-wrap items-center gap-x-7 border-b border-line text-[15px]">
        {([
          { key: "watchlist", label: "Watchlist", href: "/cave" },
          { key: "viewing", label: "Viewing Status", href: "/cave?tab=viewing" },
        ] as const).map((section) => (
          <Link key={section.key} href={section.href} scroll={false} aria-current={tab === section.key ? "page" : undefined}
            className={`flex h-11 items-center gap-2 border-b-2 transition-colors ${tab === section.key ? "border-accent font-semibold text-foreground" : "border-transparent font-medium text-muted hover:text-foreground"}`}>
            {tab === section.key && <span aria-hidden="true" className="size-1.5 rounded-full bg-accent" />}
            {section.label}
          </Link>
        ))}
        <span aria-disabled="true" className="flex h-11 items-center font-medium text-muted">My Ratings</span>
      </nav>
      <div id={tab === "watchlist" ? "watchlist" : "viewing-status"} className="scroll-mt-6">{children}</div>
    </div>
  );
}
