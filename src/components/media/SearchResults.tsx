import type { ReactNode } from "react";
import ButtonLink from "@/components/ButtonLink";
import { AlertCircleIcon, SearchIcon } from "@/components/icons";
import SearchResultsGrid from "@/components/media/SearchResultsGrid";
import { SearchResultsHeading } from "@/components/media/SearchResultsSkeleton";
import { searchTitles } from "@/lib/tmdb/catalogue";

function SearchMessage({
  icon,
  title,
  children,
}: {
  icon: ReactNode;
  title: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center rounded-md border border-dashed border-line px-6 py-14 text-center">
      <span className="flex size-11 items-center justify-center rounded-full bg-surface text-muted">
        {icon}
      </span>
      <p className="mt-4 text-base font-semibold text-foreground">{title}</p>
      <div className="mt-1.5 max-w-sm text-sm text-muted">{children}</div>
    </div>
  );
}

// US-15 Search by Title
export default async function SearchResults({ query }: { query: string }) {
  const results = await searchTitles(query);

  return (
    <section aria-live="polite">
      {results === null ? (
        <>
          <SearchResultsHeading query={query} />
          <SearchMessage
            icon={<AlertCircleIcon className="size-5" />}
            title="Search isn't available right now"
          >
            Please try again in a moment.
          </SearchMessage>
        </>
      ) : results.length === 0 ? (
        <>
          <SearchResultsHeading query={query} summary="0 titles" />
          <SearchMessage icon={<SearchIcon className="size-5" />} title={`No results for “${query}”`}>
            <p>Check the spelling, or try a shorter or different title.</p>
            <ButtonLink href="/browse" variant="secondary" className="mt-5">
              Back to Browse
            </ButtonLink>
          </SearchMessage>
        </>
      ) : (
        <SearchResultsGrid key={query} query={query} items={results} />
      )}
    </section>
  );
}
