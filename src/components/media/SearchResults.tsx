import type { ReactNode } from "react";
import ButtonLink from "@/components/ButtonLink";
import { AlertCircleIcon, SearchIcon } from "@/components/icons";
import MediaRow from "@/components/media/MediaRow";
import SearchResultsGrid from "@/components/media/SearchResultsGrid";
import { SearchResultsHeading } from "@/components/media/SearchResultsSkeleton";
import { getTrending, searchTitles } from "@/lib/tmdb/catalogue";

function SearchMessage({
  icon,
  title,
  text,
  action,
}: {
  icon: ReactNode;
  title: ReactNode;
  text: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-8 rounded-md border border-line bg-surface px-6 py-5">
      <div className="flex min-w-0 items-center gap-4">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-elevated text-muted">
          {icon}
        </span>
        <div className="min-w-0">
          <p className="truncate font-semibold text-foreground">{title}</p>
          <p className="mt-0.5 text-sm text-muted">{text}</p>
        </div>
      </div>
      {action}
    </div>
  );
}

async function NoResults({ query }: { query: string }) {
  const trending = await getTrending();

  return (
    <>
      <SearchResultsHeading query={query} summary="0 titles" />
      <SearchMessage
        icon={<SearchIcon className="size-[1.125rem]" />}
        title={`No titles match “${query}”`}
        text="Check the spelling, try fewer words, or search by the original title."
        action={
          <ButtonLink href="/browse" variant="secondary" className="shrink-0">
            Clear search
          </ButtonLink>
        }
      />
      {trending && trending.length > 0 && (
        <div className="mt-12">
          <MediaRow title="Trending Now" items={trending} />
        </div>
      )}
    </>
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
            icon={<AlertCircleIcon className="size-[1.125rem]" />}
            title="Search isn't available right now"
            text="Please try again in a moment."
          />
        </>
      ) : results.length === 0 ? (
        <NoResults query={query} />
      ) : (
        <SearchResultsGrid key={query} query={query} items={results} />
      )}
    </section>
  );
}
