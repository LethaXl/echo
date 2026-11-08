"use client";

import { useRef, useState } from "react";
import ButtonLink from "@/components/ButtonLink";
import { ArrowUpDownIcon, FilmIcon } from "@/components/icons";
import { ContentTypeToggle, FilterMenu, MenuOption } from "@/components/media/BrowseFilterBar";
import { RESULTS_GRID_CLASS_NAME } from "@/components/media/BrowseResultsSkeleton";
import MediaCard from "@/components/media/MediaCard";
import MobileCollectionFilters from "@/components/media/MobileCollectionFilters";
import MediaSearchField from "@/components/media/MediaSearchField";
import WatchlistButton from "./WatchlistButton";
import type { ContentType } from "@/lib/browse";
import { selectWatchlist, WATCHLIST_SORTS, type WatchlistItem, type WatchlistSort } from "@/lib/watchlist/model";

export default function Watchlist({ items }: { items: WatchlistItem[] }) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<WatchlistSort>("recent");
  const [type, setType] = useState<ContentType>("all");
  const search = useRef<HTMLInputElement>(null);
  const shown = selectWatchlist(items, query, sort, type);
  const searching = Boolean(query.trim());
  const filtered = searching || type !== "all";
  const savedCount = `${items.length} ${items.length === 1 ? "title" : "titles"} saved`;

  function clearSearch() {
    setQuery("");
    search.current?.focus();
  }

  return (
    <section aria-labelledby="watchlist-heading" className="pt-4">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border-b border-line pb-3">
        <div className="min-w-44">
          <h2 id="watchlist-heading" className="text-base/6 font-semibold tracking-tight">Saved Titles</h2>
          <p className="text-[13px]/5 text-muted tabular-nums">
            {filtered ? `${shown.length} of ${savedCount}` : savedCount}
          </p>
        </div>
        {items.length > 0 && (
          <div className="flex flex-wrap items-center gap-2.5 max-md:relative max-md:[&_input]:pr-28 max-md:[&_input:placeholder-shown]:pr-14 max-md:[&_button[aria-label^=Clear]]:right-14 max-md:grid max-md:w-full max-md:grid-cols-[minmax(0,1fr)_auto] max-md:gap-2">
            <ContentTypeToggle value={type} onChange={setType} className="max-md:hidden" />
            <div role="search" aria-label="Watchlist" className="w-60 max-w-full max-md:col-span-2 max-md:order-first max-md:min-w-0 max-md:w-full">
              <MediaSearchField
                inputRef={search}
                label="Search my watchlist"
                placeholder="Search your watchlist"
                value={query}
                onChange={setQuery}
                onClear={clearSearch}
              />
            </div>
            <FilterMenu
              icon={<ArrowUpDownIcon className="size-3.5" />}
              label="Sort" className="max-md:hidden" triggerClassName="max-md:[&>span:last-of-type]:hidden"
              value={WATCHLIST_SORTS[sort]}
              active
              align="right"
              panelClassName="w-50"
            >
              {(Object.keys(WATCHLIST_SORTS) as WatchlistSort[]).map((option) => (
                <MenuOption key={option} selected={option === sort} onSelect={() => setSort(option)}>
                  {WATCHLIST_SORTS[option]}
                </MenuOption>
              ))}
            </FilterMenu>
            <MobileCollectionFilters title="Refine your watchlist" type={type} sort={sort} defaultSort="recent" sorts={WATCHLIST_SORTS}
              onApply={(next) => { setType(next.type); setSort(next.sort); }} />
          </div>
        )}
      </div>
      <p role="status" className="sr-only">
        {filtered ? `${shown.length} matching titles` : ""}
      </p>
      {items.length === 0 ? (
        <div className="py-10 text-center">
          <FilmIcon className="mx-auto size-6 text-accent" />
          <h3 className="mt-3 text-lg font-semibold tracking-tight">Leave room for your next favourite.</h3>
          <p className="mt-2 mb-5 text-sm text-muted">Save a movie or show from its detail page. It&apos;ll be waiting here.</p>
          <ButtonLink href="/browse">Find something to save</ButtonLink>
        </div>
      ) : shown.length === 0 ? (
        <div className="py-10 text-center">
          <h3 className="text-lg font-semibold tracking-tight">
            {type === "all" ? "No saved titles match your search." : "No saved titles match your filters."}
          </h3>
          <button type="button" className="mt-2 rounded-sm text-sm text-accent hover:underline" onClick={() => { setType("all"); clearSearch(); }}>
            {type === "all" ? "Clear search" : "Clear filters"}
          </button>
        </div>
      ) : (
        <ul className={RESULTS_GRID_CLASS_NAME}>
          {shown.map((item) => (
            <li key={item.entryId} className="relative min-w-0">
              <MediaCard item={item} showMobileTmdbRating={false} titleAction={
                <WatchlistButton item={item} saved compact />
              } />
              {item.unavailable && (
                <p className="mt-2 text-xs text-muted">Metadata unavailable. Try again later, or remove this title.</p>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
