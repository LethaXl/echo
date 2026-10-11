"use client";

import { type ReactNode, useEffect, useId, useRef, useState } from "react";
import {
  ArrowUpDownIcon,
  CalendarIcon,
  ChevronDownIcon,
  ClapperboardIcon,
  LayersIcon,
  TagIcon,
  TvIcon,
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

const TYPES: { value: ContentType; label: string; Icon: typeof TvIcon }[] = [
  { value: "all", label: "All", Icon: LayersIcon },
  { value: "movie", label: "Movies", Icon: ClapperboardIcon },
  { value: "tv", label: "TV shows", Icon: TvIcon },
];

const YEARS = releaseYears();

function ContentTypeToggle({
  value,
  onChange,
}: {
  value: ContentType;
  onChange: (type: ContentType) => void;
}) {
  const index = TYPES.findIndex((option) => option.value === value);

  return (
    <div
      role="radiogroup"
      aria-label="Content type"
      className="relative grid h-9 grid-cols-3 rounded-full border border-accent/30 bg-accent/10 p-[3px]"
    >
      <span
        aria-hidden="true"
        className="absolute inset-y-[3px] left-[3px] w-[calc((100%-6px)/3)] rounded-full bg-accent shadow-[0_2px_10px_-2px] shadow-accent/50 transition-transform duration-300 ease-out"
        style={{ transform: `translateX(${index * 100}%)` }}
      />
      {TYPES.map(({ value: option, label, Icon }) => {
        const checked = option === value;
        return (
          <button
            key={option}
            type="button"
            role="radio"
            aria-checked={checked}
            onClick={() => onChange(option)}
            className={`relative z-10 flex w-[7rem] items-center justify-center gap-1.5 rounded-full text-[13px] font-semibold transition-colors duration-200 ${
              checked ? "text-on-accent" : "text-muted hover:text-foreground"
            }`}
          >
            <Icon className="size-3.5" />
            {label}
          </button>
        );
      })}
    </div>
  );
}

function FilterMenu({
  icon,
  label,
  value,
  active,
  align = "left",
  panelClassName = "",
  children,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  active: boolean;
  align?: "left" | "right";
  panelClassName?: string;
  /** Picking any button inside the panel closes it. */
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const selected =
      panelRef.current?.querySelector<HTMLElement>('[aria-pressed="true"]') ??
      panelRef.current?.querySelector<HTMLElement>("button");
    selected?.focus({ preventScroll: true });
    // Centres the current choice inside a scrolling list without scrolling the page.
    const list = selected?.parentElement;
    if (selected && list && list.scrollHeight > list.clientHeight) {
      list.scrollTop = selected.offsetTop - (list.clientHeight - selected.offsetHeight) / 2;
    }

    function handlePointerDown(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      setOpen(false);
      triggerRef.current?.focus();
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <div
      ref={containerRef}
      className="relative"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
    >
      <button
        ref={triggerRef}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((current) => !current)}
        className={`group flex h-9 items-center gap-1.5 rounded-full border pr-3 pl-3.5 text-[13px] whitespace-nowrap transition-colors duration-150 ${
          active
            ? "border-accent/60 bg-accent/10"
            : open
              ? "border-muted/40 bg-elevated"
              : "border-line bg-surface hover:border-muted/40 hover:bg-elevated"
        }`}
      >
        <span className={active ? "text-accent" : "text-muted group-hover:text-foreground"}>
          {icon}
        </span>
        <span className="text-muted">{label}</span>
        <span className="font-semibold text-foreground">{value}</span>
        <ChevronDownIcon
          className={`size-3.5 transition-transform duration-200 ${open ? "rotate-180" : ""} ${
            active ? "text-accent" : "text-muted"
          }`}
        />
      </button>

      {open && (
        <div
          ref={panelRef}
          id={panelId}
          className={`absolute top-full z-30 mt-1.5 rounded-xl border border-accent/35 bg-elevated p-1.5 shadow-2xl shadow-black/60 ring-1 ring-accent/10 motion-safe:animate-menu-in ${
            align === "right" ? "right-0" : "left-0"
          } ${panelClassName}`}
          onClick={(event) => {
            if (!(event.target as HTMLElement).closest("button")) return;
            setOpen(false);
            triggerRef.current?.focus();
          }}
        >
          {children}
        </div>
      )}
    </div>
  );
}

/** A scrolling list for menus with more options than fit comfortably. */
function MenuList({ children }: { children: ReactNode }) {
  return (
    <div className="relative -mr-1 max-h-72 overflow-y-auto overscroll-contain pr-1 [scrollbar-color:color-mix(in_srgb,var(--color-accent)_45%,transparent)_transparent] [scrollbar-width:thin]">
      {children}
    </div>
  );
}

function MenuOption({
  selected,
  onSelect,
  className = "",
  children,
}: {
  selected: boolean;
  onSelect: () => void;
  className?: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onSelect}
      className={`flex h-9 w-full items-center justify-center rounded-lg px-3 text-[13px] transition-colors duration-150 ${
        selected
          ? "bg-accent/20 font-semibold text-accent-hover ring-1 ring-accent/40 ring-inset"
          : "font-medium text-foreground/85 hover:bg-accent/10 hover:text-foreground"
      } ${className}`}
    >
      <span className="truncate">{children}</span>
    </button>
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
    <div className="mt-6 flex flex-wrap items-center gap-2.5">
      <ContentTypeToggle value={filters.type} onChange={selectType} />

      <FilterMenu
        icon={<TagIcon className="size-3.5" />}
        label="Genre"
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
          className="flex h-9 items-center gap-1.5 rounded-full px-3 text-[13px] font-medium text-muted transition-colors duration-150 hover:bg-danger/10 hover:text-danger"
        >
          <XIcon className="size-3.5" />
          Clear all
        </button>
      )}

      <div className="ml-auto min-w-52 flex-1 basis-0 sm:max-w-sm">{search}</div>
    </div>
  );
}
