"use client";

import MobileFilterModal from "./MobileFilterModal";
import { MobileContentType, MobileFilterSelect } from "./MobileFilterFields";
import { DEFAULT_FILTERS, genresFor, releaseYears, SORT_LABELS, sortsFor, type BrowseFilters, type BrowseSort } from "@/lib/browse";

const YEARS = releaseYears();

export default function MobileBrowseFilters({ filters, searching, onApply }: {
  filters: BrowseFilters;
  searching: boolean;
  onApply: (filters: BrowseFilters) => void;
}) {
  const count = Number(filters.type !== "all") + Number(filters.genre !== null) + Number(filters.year !== null) + Number(filters.sort !== "popular");
  return <MobileFilterModal title="Refine your browse" value={filters} defaults={DEFAULT_FILTERS} count={count} onApply={onApply}>
    {(draft, update) => <div className="space-y-5">
      <MobileContentType value={draft.type} onChange={(type) => update({ ...draft, type,
        genre: genresFor(type).some((genre) => genre.slug === draft.genre) ? draft.genre : null,
      })} />
      <div className="grid grid-cols-1 gap-3 min-[360px]:grid-cols-2">
        <MobileFilterSelect label="Genre" value={draft.genre ?? ""} onChange={(genre) => update({ ...draft, genre: genre || null })}>
          <option value="">All genres</option>
          {genresFor(draft.type).map((genre) => <option key={genre.slug} value={genre.slug}>{genre.label}</option>)}
        </MobileFilterSelect>
        <MobileFilterSelect label="Year" value={draft.year === null ? "" : String(draft.year)} onChange={(value) => {
          const year = value ? Number(value) : null;
          update({ ...draft, year, sort: sortsFor(year).includes(draft.sort) ? draft.sort : "popular" });
        }}>
          <option value="">Any year</option>
          {YEARS.map((year) => <option key={year} value={year}>{year}</option>)}
        </MobileFilterSelect>
      </div>
      <div className="flex justify-center [&>div]:w-fit [&>div]:max-w-full">
      <MobileFilterSelect label="Sort" value={draft.sort} onChange={(sort) => update({ ...draft, sort: sort as BrowseSort })}>
        {sortsFor(draft.year).map((sort) => <option key={sort} value={sort}>{sort === "popular" && searching ? "Best match" : SORT_LABELS[sort]}</option>)}
      </MobileFilterSelect>
      </div>
    </div>}
  </MobileFilterModal>;
}
