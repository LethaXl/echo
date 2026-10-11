"use client";

import { useRouter } from "next/navigation";
import {
  useEffect,
  useEffectEvent,
  useOptimistic,
  useRef,
  useState,
  useTransition,
  type ReactNode,
} from "react";
import { SearchIcon, SpinnerIcon, XIcon } from "@/components/icons";
import BrowseFilterBar, { BrowseSortMenu } from "@/components/media/BrowseFilterBar";
import BrowseResultsSkeleton from "@/components/media/BrowseResultsSkeleton";
import {
  type BrowseFilters,
  browseHref,
  DEFAULT_FILTERS,
  isFiltered,
  rememberBrowseHref,
} from "@/lib/browse";
import { normalizeSearchQuery } from "@/lib/search";

const DEBOUNCE_MS = 350;

type BrowseSearchProps = {
  /** The normalized `?q=` the page was rendered with. */
  query: string;
  /** The filters the page was rendered with. */
  filters: BrowseFilters;
  /** The page header, shown above the filters. */
  header: ReactNode;
  /** Results when searching or filtering, otherwise the regular Browse sections. */
  children: ReactNode;
};

// US-15 Search by Title, US-21 Combine Search and Filters, US-22 Clear Search and Filters
export default function BrowseSearch({ query, filters, header, children }: BrowseSearchProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState(query);
  const [requestedQuery, setRequestedQuery] = useState(query);
  const [renderedQuery, setRenderedQuery] = useState(query);
  // Shows the chosen filters straight away while the new results load.
  const [shownFilters, setShownFilters] = useOptimistic(filters);
  const [isPending, startTransition] = useTransition();

  // The URL changed without us asking (Back/Forward, the navbar's Browse link): follow it.
  if (query !== renderedQuery) {
    setRenderedQuery(query);
    if (query !== requestedQuery) {
      setRequestedQuery(query);
      setValue(query);
    }
  }

  const currentHref = browseHref(query, filters);
  useEffect(() => rememberBrowseHref(currentHref), [currentHref]);

  function navigate(nextQuery: string, nextFilters: BrowseFilters) {
    setRequestedQuery(nextQuery);
    startTransition(() => {
      setShownFilters(nextFilters);
      router.replace(browseHref(nextQuery, nextFilters), { scroll: false });
    });
  }

  function search(nextQuery: string) {
    navigate(nextQuery, shownFilters);
  }

  const onDebounced = useEffectEvent(search);

  useEffect(() => {
    const nextQuery = normalizeSearchQuery(value);
    if (!nextQuery || nextQuery === requestedQuery) return;
    const timer = setTimeout(() => onDebounced(nextQuery), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [value, requestedQuery]);

  function handleChange(nextValue: string) {
    setValue(nextValue);
    // Clearing the field updates straight away rather than after the debounce.
    if (!normalizeSearchQuery(nextValue) && requestedQuery) search("");
  }

  function clear() {
    handleChange("");
    inputRef.current?.focus();
  }

  function clearAll() {
    setValue("");
    navigate("", DEFAULT_FILTERS);
  }

  // A filter change keeps the search, including text still waiting on the debounce.
  const changeFilters = (nextFilters: BrowseFilters) =>
    navigate(normalizeSearchQuery(value), nextFilters);
  const showResults = requestedQuery !== "" || isFiltered(shownFilters);

  return (
    <>
      {header}

      <BrowseFilterBar
        filters={shownFilters}
        canClear={value !== "" || showResults}
        onChange={changeFilters}
        onClearAll={clearAll}
        search={
          <form
            role="search"
            onSubmit={(event) => {
              event.preventDefault();
              const nextQuery = normalizeSearchQuery(value);
              if (nextQuery && nextQuery !== requestedQuery) search(nextQuery);
            }}
          >
            <label htmlFor="browse-search" className="sr-only">
              Search movies and shows
            </label>
            <div className="relative">
              <span className="pointer-events-none absolute top-1/2 left-3.5 flex -translate-y-1/2 text-muted">
                {isPending ? (
                  <SpinnerIcon className="size-3.5" />
                ) : (
                  <SearchIcon className="size-3.5" />
                )}
              </span>
              <input
                ref={inputRef}
                id="browse-search"
                type="search"
                value={value}
                onChange={(event) => handleChange(event.target.value)}
                placeholder="Search movies and shows"
                autoComplete="off"
                spellCheck={false}
                enterKeyHint="search"
                className="h-9 w-full rounded-full border border-line bg-surface pr-10 pl-9 text-[13px] text-foreground transition-colors placeholder:text-muted/70 hover:border-muted/40 focus:border-accent/70 focus:outline-none [&::-webkit-search-cancel-button]:appearance-none"
              />
              {value && (
                <button
                  type="button"
                  onClick={clear}
                  aria-label="Clear search"
                  className="absolute top-1/2 right-1.5 flex size-6 -translate-y-1/2 items-center justify-center rounded-full text-muted transition-colors hover:bg-elevated hover:text-foreground"
                >
                  <XIcon className="size-3.5" />
                </button>
              )}
            </div>
          </form>
        }
      />

      <div className="relative mt-8">
        {/* Sits on the results heading row; the regular Browse sections have nothing to sort. */}
        {showResults && (
          <div className="absolute top-1.5 right-0 z-20">
            <BrowseSortMenu
              sort={shownFilters.sort}
              year={shownFilters.year}
              searching={requestedQuery !== ""}
              onChange={(sort) => changeFilters({ ...shownFilters, sort })}
            />
          </div>
        )}
        {isPending && showResults ? <BrowseResultsSkeleton /> : children}
      </div>
    </>
  );
}
