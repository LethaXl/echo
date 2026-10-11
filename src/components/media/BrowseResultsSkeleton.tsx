import type { ReactNode } from "react";

export const RESULTS_GRID_CLASS_NAME =
  "grid grid-cols-4 gap-x-5 gap-y-8 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7";

const BLOCK = "rounded-md bg-elevated motion-safe:animate-pulse";

type ResultsHeadingProps = {
  title: ReactNode;
  /** Rendered under the heading, e.g. "38 titles". */
  summary?: ReactNode;
};

export function ResultsHeading({ title, summary }: ResultsHeadingProps) {
  return (
    // Leaves room for the sort menu on the right.
    <div className="mb-5 border-b border-line pr-64 pb-3">
      <h2 className="truncate text-lg/7 font-semibold tracking-tight">{title}</h2>
      <p className="min-h-5 text-[13px]/5 text-muted tabular-nums">{summary}</p>
    </div>
  );
}

export default function BrowseResultsSkeleton() {
  return (
    <section aria-busy="true">
      <div className="mb-5 border-b border-line pb-3">
        <div className={`h-6 w-56 ${BLOCK}`} />
        <div className={`mt-1.5 h-4 w-20 ${BLOCK}`} />
      </div>
      <span className="sr-only">Loading titles…</span>
      <ul className={RESULTS_GRID_CLASS_NAME}>
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
