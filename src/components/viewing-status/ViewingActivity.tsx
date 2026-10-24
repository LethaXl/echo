"use client";

import { useRef, useState } from "react";
import ButtonLink from "@/components/ButtonLink";
import { ArrowUpDownIcon, CircleCheckIcon, EyeIcon, LayersIcon } from "@/components/icons";
import { FilterMenu, MenuOption } from "@/components/media/BrowseFilterBar";
import { RESULTS_GRID_CLASS_NAME } from "@/components/media/BrowseResultsSkeleton";
import MediaCard from "@/components/media/MediaCard";
import MediaSearchField from "@/components/media/MediaSearchField";
import ViewingStatusControl from "./ViewingStatusControl";
import { filterViewingActivity, type ViewingFilter, type ViewingItem } from "@/lib/viewing-status/model";
import { WATCHLIST_SORTS, type WatchlistSort } from "@/lib/watchlist/model";

export default function ViewingActivity({ items }: { items: ViewingItem[] }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<ViewingFilter>("all");
  const [sort, setSort] = useState<WatchlistSort>("recent");
  const search = useRef<HTMLInputElement>(null);
  const shown = filterViewingActivity(items, query, filter, sort);
  const filtered = Boolean(query.trim()) || filter !== "all";
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
          <div className="flex flex-wrap items-center gap-2.5">
            <div role="group" aria-label="Filter viewing status" className="flex h-9 rounded-full border border-accent/30 bg-accent/10 p-[3px]">
              {options.map(({ value, label, Icon }) => (
                <button key={value} type="button" aria-pressed={filter === value} onClick={() => setFilter(value)}
                  className={`flex items-center gap-1.5 rounded-full px-3 text-[13px] font-semibold transition-colors ${filter === value ? "bg-accent text-on-accent" : "text-muted hover:text-foreground"}`}>
                  <Icon className="size-3.5" />{label}
                </button>
              ))}
            </div>
            <div role="search" aria-label="Viewing activity" className="w-60 max-w-full">
              <MediaSearchField inputRef={search} label="Search viewing activity" placeholder="Search tracked titles"
                value={query} onChange={setQuery} onClear={clearSearch} />
            </div>
            <FilterMenu
              icon={<ArrowUpDownIcon className="size-3.5" />}
              label="Sort"
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
            onClick={() => { setFilter("all"); clearSearch(); }}>Clear filters</button>
        </div>
      ) : (
        <ul className={RESULTS_GRID_CLASS_NAME}>
          {shown.map((item) => (
            <li key={item.entryId} className="min-w-0">
              <MediaCard item={item} titleAction={
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
