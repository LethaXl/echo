"use client";

import type { ReactNode } from "react";
import {
  ArrowUpDownIcon,
  CalendarIcon,
  TagIcon,
  XIcon,
} from "@/components/icons";
import {
  type BrowseFilters,
  type BrowseSort,
  type ContentType,
  genresFor,
  releaseYears,
  SORT_LABELS,
  sortsFor,
} from "@/lib/browse";

import MobileBrowseFilters from "./MobileBrowseFilters";
import { ContentTypeToggle } from "./ContentTypeToggle";
import { FilterMenu, MenuOption } from "./EchoFilterMenu";
export { ContentTypeToggle, FilterMenu, MenuOption };

const YEARS = releaseYears();

/** A scrolling list for menus with more options than fit comfortably. */
function MenuList({ children }: { children: ReactNode }) {
  return (
    <div className="relative -mr-1 max-h-72 overflow-y-auto overscroll-contain pr-1 [scrollbar-color:color-mix(in_srgb,var(--color-accent)_45%,transparent)_transparent] [scrollbar-width:thin]">
      {children}
    </div>
  );
}

// US-19, US-20
export function BrowseSortMenu({
  sort: current,
  year,
  searching,
  onChange,
}: {
  sort: BrowseSort;
  /** The year filter, which limits the sorts on offer. */
  year: number | null;
  /** Whether a search is active, which changes what the default sort means. */
  searching: boolean;
  onChange: (sort: BrowseSort) => void;
}) {
  const sortLabel = (sort: BrowseSort) =>
    sort === "popular" && searching ? "Best match" : SORT_LABELS[sort];

  return (
    <FilterMenu
      icon={<ArrowUpDownIcon className="size-3.5" />}
      label="Sort"
      value={sortLabel(current)}
      // A sort always applies, so it's shown as set even on the default.
      active
      align="right"
      panelClassName="w-40"
    >
      {sortsFor(year).map((sort) => (
        <MenuOption key={sort} selected={sort === current} onSelect={() => onChange(sort)}>
          {sortLabel(sort)}
        </MenuOption>
      ))}
    </FilterMenu>
  );
}

type BrowseFilterBarProps = {
  filters: BrowseFilters;
  searching?: boolean;
  /** Whether there's a search or any filter to clear. */
  canClear: boolean;
  onChange: (filters: BrowseFilters) => void;
  onClearAll: () => void;
  /** The search field, shown at the end of the row. */
  search: ReactNode;
};

// US-16 to US-18, US-22
export default function BrowseFilterBar({
  filters,
  canClear,
  searching = false,
  onChange,
  onClearAll,
  search,
}: BrowseFilterBarProps) {
  const update = (patch: Partial<BrowseFilters>) => onChange({ ...filters, ...patch });
  const genres = genresFor(filters.type);
  const genreLabel = genres.find((genre) => genre.slug === filters.genre)?.label;

  function selectType(type: ContentType) {
    // Keep the genre unless the new type has no such genre on TMDB (e.g. Horror for TV).
    const keepGenre = genresFor(type).some((genre) => genre.slug === filters.genre);
    update({ type, genre: keepGenre ? filters.genre : null });
  }

  function selectYear(year: number | null) {
    const keepSort = sortsFor(year).includes(filters.sort);
    update({ year, sort: keepSort ? filters.sort : "popular" });
  }

  return (
    <div className="mt-6 flex flex-wrap items-center gap-2.5 max-md:relative max-md:[&_input]:pr-28 max-md:[&_input:placeholder-shown]:pr-14 max-md:[&_button[aria-label^=Clear]]:right-14 max-md:mt-5 max-md:grid max-md:grid-cols-[minmax(0,1fr)_auto] max-md:gap-2">
      <ContentTypeToggle value={filters.type} onChange={selectType} className="max-md:hidden" />

      <FilterMenu
        icon={<TagIcon className="size-3.5" />}
        label="Genre"
        className="max-md:hidden"
        value={genreLabel ?? "All"}
        active={filters.genre !== null}
        panelClassName="w-40"
      >
        <MenuList>
          {genres.map((genre) => {
            const selected = genre.slug === filters.genre;
            return (
              <MenuOption
                key={genre.slug}
                selected={selected}
                onSelect={() => update({ genre: selected ? null : genre.slug })}
              >
                {genre.label}
              </MenuOption>
            );
          })}
        </MenuList>
      </FilterMenu>

      <FilterMenu
        icon={<CalendarIcon className="size-3.5" />}
        label="Year"
        className="max-md:hidden"
        value={filters.year === null ? "Any" : String(filters.year)}
        active={filters.year !== null}
        panelClassName="w-28"
      >
        <MenuList>
          {YEARS.map((year) => {
            const selected = year === filters.year;
            return (
              <MenuOption
                key={year}
                selected={selected}
                onSelect={() => selectYear(selected ? null : year)}
                className="tabular-nums"
              >
                {year}
              </MenuOption>
            );
          })}
        </MenuList>
      </FilterMenu>

      {canClear && (
        <button
          type="button"
          onClick={onClearAll}
          className="max-md:hidden flex h-9 items-center gap-1.5 rounded-full px-3 text-[13px] font-medium text-muted transition-colors duration-150 hover:bg-danger/10 hover:text-danger"
        >
          <XIcon className="size-3.5" />
          Clear all
        </button>
      )}

      <div className="ml-auto min-w-52 flex-1 basis-0 sm:max-w-sm max-md:col-span-2 max-md:order-first max-md:ml-0 max-md:w-full max-md:min-w-0 max-md:max-w-none max-md:basis-auto">{search}</div>
      <MobileBrowseFilters filters={filters} searching={searching} onApply={onChange} />
    </div>
  );
}
