"use client";

import { useState } from "react";
import MediaCard from "@/components/media/MediaCard";
import {
  SEARCH_GRID_CLASS_NAME,
  SearchResultsHeading,
} from "@/components/media/SearchResultsSkeleton";
import type { CatalogueItem, MediaType } from "@/types/media";

type Filter = "all" | MediaType;

const FILTERS: { value: Filter; label: string; noun: string }[] = [
  { value: "all", label: "All", noun: "title" },
  { value: "movie", label: "Movies", noun: "movie" },
  { value: "tv", label: "TV shows", noun: "TV show" },
];

const pluralize = (count: number, noun: string) => `${count} ${noun}${count === 1 ? "" : "s"}`;

// US-15 Search by Title
export default function SearchResultsGrid({
  query,
  items,
}: {
  query: string;
  items: CatalogueItem[];
}) {
  const [filter, setFilter] = useState<Filter>("all");

  const counts: Record<Filter, number> = {
    all: items.length,
    movie: items.filter((item) => item.mediaType === "movie").length,
    tv: items.filter((item) => item.mediaType === "tv").length,
  };
  const showFilter = counts.movie > 0 && counts.tv > 0;
  const active = showFilter ? filter : counts.movie > 0 ? "movie" : "tv";
  const visible = active === "all" ? items : items.filter((item) => item.mediaType === active);
  const noun = FILTERS.find((option) => option.value === active)?.noun ?? "title";

  return (
    <>
      <SearchResultsHeading query={query} summary={pluralize(visible.length, noun)}>
        {showFilter && (
          <div
            role="radiogroup"
            aria-label="Filter results"
            className="flex shrink-0 rounded-md border border-line bg-surface p-0.5 text-[0.8125rem] font-medium"
          >
            {FILTERS.map((option) => {
              const checked = option.value === filter;
              return (
                <button
                  key={option.value}
                  type="button"
                  role="radio"
                  aria-checked={checked}
                  onClick={() => setFilter(option.value)}
                  className={`flex items-center gap-2 rounded-[5px] px-3 py-1.5 transition-colors duration-150 ${
                    checked ? "bg-elevated text-foreground" : "text-muted hover:text-foreground"
                  }`}
                >
                  {option.label}
                  <span
                    className={`text-xs tabular-nums ${checked ? "text-accent" : "text-muted/70"}`}
                  >
                    {counts[option.value]}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </SearchResultsHeading>

      <ul key={active} className={`${SEARCH_GRID_CLASS_NAME} motion-safe:animate-fade-in-up`}>
        {visible.map((item) => (
          <li key={`${item.mediaType}-${item.tmdbId}`}>
            <MediaCard item={item} detailedMeta />
          </li>
        ))}
      </ul>
    </>
  );
}
