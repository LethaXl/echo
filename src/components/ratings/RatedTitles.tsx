"use client";

import { useRef, useState } from "react";
import ButtonLink from "@/components/ButtonLink";
import { ArrowUpDownIcon } from "@/components/icons";
import { ContentTypeToggle, FilterMenu, MenuOption } from "@/components/media/BrowseFilterBar";
import { RESULTS_GRID_CLASS_NAME } from "@/components/media/BrowseResultsSkeleton";
import MediaCard from "@/components/media/MediaCard";
import MobileCollectionFilters from "@/components/media/MobileCollectionFilters";
import MediaSearchField from "@/components/media/MediaSearchField";
import RatingDialog from "./RatingDialog";
import EchoWaveSymbol from "./EchoWaveSymbol";
import { RATING_SORTS, selectRatedTitles, type RatedItem, type RatingSort } from "@/lib/ratings/model";
import type { ContentType } from "@/lib/browse";

export default function RatedTitles({ items }: { items: RatedItem[] }) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<RatingSort>("recent");
  const [type, setType] = useState<ContentType>("all");
  const search = useRef<HTMLInputElement>(null);
  const shown = selectRatedTitles(items, query, sort, type);
  const searching = Boolean(query.trim());
  const filtered = searching || type !== "all";
  function clearSearch() { setQuery(""); search.current?.focus(); }

  return (
    <section aria-labelledby="ratings-heading" className="pt-4">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border-b border-line pb-3">
        <div>
          <h2 id="ratings-heading" className="text-base/6 font-semibold tracking-tight">Rated Titles</h2>
          <p className="text-[13px]/5 text-muted tabular-nums">
            {filtered ? `${shown.length} of ` : ""}{items.length} {items.length === 1 ? "title" : "titles"} rated
          </p>
        </div>
        {items.length > 0 && (
          <div className="flex flex-wrap items-center gap-2.5 max-md:relative max-md:[&_input]:pr-28 max-md:[&_input:placeholder-shown]:pr-14 max-md:[&_button[aria-label^=Clear]]:right-14 max-md:grid max-md:w-full max-md:grid-cols-[minmax(0,1fr)_auto] max-md:gap-2">
            <ContentTypeToggle value={type} onChange={setType} className="max-md:hidden" />
            <div role="search" aria-label="My ratings" className="w-60 max-w-full max-md:col-span-2 max-md:order-first max-md:min-w-0 max-md:w-full">
              <MediaSearchField inputRef={search} label="Search rated titles" value={query} onChange={setQuery} onClear={clearSearch} />
            </div>
            <FilterMenu icon={<ArrowUpDownIcon className="size-3.5" />} label="Sort" className="max-md:hidden" triggerClassName="max-md:[&>span:last-of-type]:hidden" value={RATING_SORTS[sort]}
              active align="right" panelClassName="w-44">
              {(Object.keys(RATING_SORTS) as RatingSort[]).map((option) => (
                <MenuOption key={option} selected={sort === option} onSelect={() => setSort(option)}>{RATING_SORTS[option]}</MenuOption>
              ))}
            </FilterMenu>
            <MobileCollectionFilters title="Refine your ratings" type={type} sort={sort} defaultSort="recent" sorts={RATING_SORTS}
              onApply={(next) => { setType(next.type); setSort(next.sort); }} />
          </div>
        )}
      </div>
      <p role="status" className="sr-only">{shown.length} matching rated titles</p>
      {items.length === 0 ? (
        <div className="py-10 text-center">
          <EchoWaveSymbol level={5} className="mx-auto h-9 w-8 text-accent" />
          <h3 className="mt-3 text-lg font-semibold tracking-tight">No ratings yet.</h3>
          <p className="mt-2 mb-5 text-sm text-muted">Rate movies and shows to keep your favourites close.</p>
          <ButtonLink href="/browse">Explore titles</ButtonLink>
        </div>
      ) : shown.length === 0 ? (
        <div className="py-10 text-center">
          <h3 className="text-lg font-semibold tracking-tight">
            {searching ? "No rated titles match your search." : type === "movie" ? "No rated movies yet." : "No rated TV shows yet."}
          </h3>
          <button type="button" onClick={() => { setType("all"); clearSearch(); }} className="mt-2 rounded-sm text-sm text-accent hover:underline">
            {type === "all" ? "Clear search" : "Clear filters"}
          </button>
        </div>
      ) : (
        <ul className={RESULTS_GRID_CLASS_NAME}>
          {shown.map((item) => (
            <li key={item.entryId} className="min-w-0">
              <MediaCard item={item} showTmdbRating={false} titleAction={
                <RatingDialog item={item} rating={item.rating} compact />
              } />
              {item.unavailable && <p className="mt-2 text-xs text-muted">Metadata unavailable. You can still clear your rating.</p>}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
