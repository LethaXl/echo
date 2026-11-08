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
import MediaSearchField from "@/components/media/MediaSearchField";
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
        searching={requestedQuery !== ""}
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
            <MediaSearchField
              inputRef={inputRef}
              label="Search movies and shows"
              value={value}
              onChange={handleChange}
              onClear={clear}
              pending={isPending}
            />
          </form>
        }
      />

      <div className="relative mt-8 max-md:mt-6">
        {/* Sits on the results heading row; the regular Browse sections have nothing to sort. */}
        {showResults && (
          <div className="absolute top-1.5 right-0 z-20 max-md:hidden">
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
