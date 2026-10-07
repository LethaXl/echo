import type { ReactNode } from "react";

export const SEARCH_GRID_CLASS_NAME =
  "grid grid-cols-4 gap-x-5 gap-y-8 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7";

const BLOCK = "rounded-md bg-elevated motion-safe:animate-pulse";

type SearchResultsHeadingProps = {
  query: string;
  /** Rendered under the heading, e.g. "38 titles". */
  summary?: ReactNode;
  /** Controls aligned to the right of the heading, e.g. the type filter. */
  children?: ReactNode;
};

export function SearchResultsHeading({ query, summary, children }: SearchResultsHeadingProps) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-x-6 gap-y-3 border-b border-line pb-4">
      <div className="max-w-full min-w-0">
        <h2 className="truncate text-xl font-semibold tracking-tight">
          <span className="text-muted">Results for</span> “{query}”
        </h2>
        <p className="mt-1 h-5 text-sm text-muted tabular-nums">{summary}</p>
      </div>
      {children}
    </div>
  );
}

export default function SearchResultsSkeleton({ query }: { query: string }) {
  return (
    <section aria-busy="true">
      <SearchResultsHeading query={query} summary="Searching…" />
      <ul className={SEARCH_GRID_CLASS_NAME}>
        {Array.from({ length: 14 }, (_, index) => (
          <li key={index}>
            <div className={`aspect-[2/3] ${BLOCK}`} />
            <div className={`mt-2.5 h-3.5 w-3/4 ${BLOCK}`} />
            <div className={`mt-1.5 h-3 w-1/2 ${BLOCK}`} />
          </li>
        ))}
      </ul>
    </section>
  );
}
