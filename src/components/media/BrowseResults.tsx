import type { ReactNode } from "react";
import ButtonLink from "@/components/ButtonLink";
import { AlertCircleIcon, SearchIcon } from "@/components/icons";
import MediaCard from "@/components/media/MediaCard";
import MediaRow from "@/components/media/MediaRow";
import {
  RESULTS_GRID_CLASS_NAME,
  ResultsHeading,
} from "@/components/media/BrowseResultsSkeleton";
import {
  type BrowseFilters,
  browseHref,
  DEFAULT_FILTERS,
  findGenre,
  isFiltered,
} from "@/lib/browse";
import { discoverTitles, getTrending, searchTitles } from "@/lib/tmdb/catalogue";

const SORT_SUMMARIES = { title: "Sorted A–Z", newest: "Newest first" } as const;

const TYPE_NOUNS = {
  all: ["title", "titles"],
  movie: ["movie", "movies"],
  tv: ["TV show", "TV shows"],
} as const;

function countLabel(count: number, type: BrowseFilters["type"]): string {
  const [singular, plural] = TYPE_NOUNS[type];
  return `${count} ${count === 1 ? singular : plural}`;
}

/** "Drama movies from 2019", "TV shows", "Movies and shows". */
function describeFilters({ type, genre, year }: BrowseFilters): string {
  const noun = type === "all" ? "movies and shows" : TYPE_NOUNS[type][1];
  const label = findGenre(genre)?.label;
  const text = `${label ? `${label} ${noun}` : noun}${year !== null ? ` from ${year}` : ""}`;
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** Explains when a genre only exists on one side of TMDB, so half the results aren't missing silently. */
function genreNote({ type, genre }: BrowseFilters): string | null {
  const match = findGenre(genre);
  if (type !== "all" || !match) return null;
  if (match.tv === null) return `${match.label} is a movie genre on TMDB, so only movies are shown.`;
  if (match.movie === null) return `${match.label} is a TV genre on TMDB, so only TV shows are shown.`;
  return null;
}

function ResultsMessage({
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

async function NoResults({ query, filters }: { query: string; filters: BrowseFilters }) {
  const trending = await getTrending();
  const filtered = isFiltered(filters);

  return (
    <>
      <ResultsMessage
        icon={<SearchIcon className="size-[1.125rem]" />}
        title={
          query
            ? `No titles match “${query}”${filtered ? " with these filters" : ""}`
            : "No titles match these filters"
        }
        text={
          filtered
            ? "Try a different genre or year, or remove a filter."
            : "Check the spelling, try fewer words, or search by the original title."
        }
        action={
          <ButtonLink
            href={filtered ? browseHref(query, DEFAULT_FILTERS) : "/browse"}
            variant="secondary"
            className="shrink-0"
          >
            {filtered ? "Clear filters" : "Clear search"}
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

/** US-15 to US-21: search results and/or filtered, sorted titles. */
export default async function BrowseResults({
  query,
  filters,
}: {
  query: string;
  filters: BrowseFilters;
}) {
  const results = query ? await searchTitles(query, filters) : await discoverTitles(filters);
  const note = genreNote(filters);
  const title = query ? (
    <>
      <span className="text-muted">Results for</span> “{query}”
    </>
  ) : (
    describeFilters(filters)
  );
  const summary =
    results && results.length > 0
      ? [
          countLabel(results.length, filters.type),
          filters.sort !== "popular" && SORT_SUMMARIES[filters.sort],
          note,
        ]
          .filter(Boolean)
          .join(" · ")
      : note;

  return (
    <section aria-live="polite">
      <ResultsHeading title={title} summary={summary} />
      {results === null ? (
        <ResultsMessage
          icon={<AlertCircleIcon className="size-[1.125rem]" />}
          title="Titles couldn't be loaded right now"
          text="Please try again in a moment."
        />
      ) : results.length === 0 ? (
        <NoResults query={query} filters={filters} />
      ) : (
        <ul className={`${RESULTS_GRID_CLASS_NAME} motion-safe:animate-fade-in-up`}>
          {results.map((item) => (
            <li key={`${item.mediaType}-${item.tmdbId}`}>
              <MediaCard item={item} detailedMeta />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
