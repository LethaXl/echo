"use client";

import { useRef, useState } from "react";
import ButtonLink from "@/components/ButtonLink";
import { ArrowUpDownIcon, CircleCheckIcon, ClapperboardIcon, EyeIcon, LayersIcon, TvIcon } from "@/components/icons";
import { FilterMenu, MenuOption } from "@/components/media/BrowseFilterBar";
import { RESULTS_GRID_CLASS_NAME } from "@/components/media/BrowseResultsSkeleton";
import MediaCard from "@/components/media/MediaCard";
import MobileCollectionFilters from "@/components/media/MobileCollectionFilters";
import MediaSearchField from "@/components/media/MediaSearchField";
import ViewingStatusControl from "./ViewingStatusControl";
import { filterViewingActivity, type ViewingFilter, type ViewingItem } from "@/lib/viewing-status/model";
import { WATCHLIST_SORTS, type WatchlistSort } from "@/lib/watchlist/model";
import type { ContentType } from "@/lib/browse";

const CONTENT_TYPES = [
  { value: "all", label: "All", Icon: LayersIcon },
  { value: "movie", label: "Movies", Icon: ClapperboardIcon },
  { value: "tv", label: "TV shows", Icon: TvIcon },
] as const;

export default function ViewingActivity({ items }: { items: ViewingItem[] }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<ViewingFilter>("all");
  const [sort, setSort] = useState<WatchlistSort>("recent");
  const [type, setType] = useState<ContentType>("all");
  const search = useRef<HTMLInputElement>(null);
  const shown = filterViewingActivity(items, query, filter, sort, type);
  const filtered = Boolean(query.trim()) || filter !== "all" || type !== "all";
  const selectedType = CONTENT_TYPES.find((option) => option.value === type) ?? CONTENT_TYPES[0];
  const options = [
    { value: "all", label: "All", Icon: LayersIcon },
    { value: "watching", label: "Watching", Icon: EyeIcon },
    { value: "completed", label: "Completed", Icon: CircleCheckIcon },
  ] as const;

  function clearSearch() { setQuery(""); search.current?.focus(); }

  return (
    <section aria-labelledby="viewing-heading" className="pt-4">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border-b border-line pb-3">
        <div>
          <h2 id="viewing-heading" className="text-base/6 font-semibold tracking-tight">Viewing Activity</h2>
          <p className="text-[13px]/5 text-muted tabular-nums">
            {filtered ? `${shown.length} of ` : ""}{items.length} {items.length === 1 ? "title" : "titles"} tracked
          </p>
        </div>
        {items.length > 0 && (
          <div className="flex flex-wrap items-center gap-2.5 max-md:relative max-md:[&_input]:pr-28 max-md:[&_input:placeholder-shown]:pr-14 max-md:[&_button[aria-label^=Clear]]:right-14 max-md:grid max-md:w-full max-md:grid-cols-[minmax(0,1fr)_auto] max-md:gap-2">
            <div role="group" aria-label="Filter viewing status" className="flex h-9 max-md:hidden max-md:order-1 max-md:col-span-2 max-md:h-11 max-md:w-full rounded-full border border-accent/30 bg-accent/10 p-[3px]">
              {options.map(({ value, label, Icon }) => (
                <button key={value} type="button" aria-pressed={filter === value} onClick={() => setFilter(value)}
                  className={`flex items-center gap-1.5 rounded-full px-3 max-md:flex-1 max-md:justify-center max-md:px-2 text-[13px] font-semibold transition-colors ${filter === value ? "bg-accent text-on-accent" : "text-muted hover:text-foreground"}`}>
                  <Icon className="size-3.5 max-md:hidden" />{label}
                </button>
              ))}
            </div>
            <FilterMenu icon={<selectedType.Icon className="size-3.5" />} label="Type" className="max-md:hidden"
              value={selectedType.label} active={type !== "all"} panelClassName="w-36">
              {CONTENT_TYPES.map((option) => (
                <MenuOption key={option.value} selected={type === option.value} onSelect={() => setType(option.value)}>
                  <span className="flex items-center justify-center gap-2"><option.Icon className="size-3.5" />{option.label}</span>
                </MenuOption>
              ))}
            </FilterMenu>
            <div role="search" aria-label="Viewing activity" className="w-60 max-w-full max-md:col-span-2 max-md:order-first max-md:min-w-0 max-md:w-full">
              <MediaSearchField inputRef={search} label="Search viewing activity" placeholder="Search tracked titles"
                value={query} onChange={setQuery} onClear={clearSearch} />
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
                <MenuOption key={option} selected={sort === option} onSelect={() => setSort(option)}>
                  {WATCHLIST_SORTS[option]}
                </MenuOption>
              ))}
            </FilterMenu>
            <MobileCollectionFilters title="Refine viewing activity" type={type} sort={sort} defaultSort="recent" sorts={WATCHLIST_SORTS} status={filter}
              onApply={(next) => { setType(next.type); setSort(next.sort); setFilter(next.status ?? "all"); }} />
          </div>
        )}
      </div>
      <p role="status" className="sr-only">{shown.length} matching tracked titles</p>
      {items.length === 0 ? (
        <div className="py-10 text-center">
          <EyeIcon className="mx-auto size-6 text-accent" />
          <h3 className="mt-3 text-lg font-semibold tracking-tight">Nothing tracked yet.</h3>
          <p className="mt-2 mb-5 text-sm text-muted">Mark movies and shows as Watching or Completed to keep track of your viewing activity.</p>
          <ButtonLink href="/browse">Explore titles</ButtonLink>
        </div>
      ) : shown.length === 0 ? (
        <div className="py-10 text-center">
          <h3 className="text-lg font-semibold tracking-tight">No tracked titles match your filters.</h3>
          <button type="button" className="mt-2 rounded-sm text-sm text-accent hover:underline"
            onClick={() => { setFilter("all"); setType("all"); clearSearch(); }}>Clear filters</button>
        </div>
      ) : (
        <ul className={RESULTS_GRID_CLASS_NAME}>
          {shown.map((item) => (
            <li key={item.entryId} className="min-w-0">
              <MediaCard item={item} showMobileTmdbRating={false} titleAction={
                <ViewingStatusControl item={item} status={item.status} compact />
              } />
              {item.unavailable && <p className="mt-2 text-xs text-muted">Metadata unavailable. You can still clear this status.</p>}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
