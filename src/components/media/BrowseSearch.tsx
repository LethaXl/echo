"use client";

import { useRouter } from "next/navigation";
import {
  useEffect,
  useEffectEvent,
  useRef,
  useState,
  useTransition,
  type ReactNode,
} from "react";
import { SearchIcon, SpinnerIcon, XIcon } from "@/components/icons";
import SearchResultsSkeleton from "@/components/media/SearchResultsSkeleton";
import { normalizeSearchQuery } from "@/lib/search";

const DEBOUNCE_MS = 350;

type BrowseSearchProps = {
  /** The normalized `?q=` the page was rendered with. */
  query: string;
  /** Search results when `query` is set, otherwise the regular Browse sections. */
  children: ReactNode;
};

// US-15 Search by Title
export default function BrowseSearch({ query, children }: BrowseSearchProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState(query);
  const [requestedQuery, setRequestedQuery] = useState(query);
  const [renderedQuery, setRenderedQuery] = useState(query);
  const [isPending, startTransition] = useTransition();

  // The URL changed without us asking (Back/Forward, or the navbar's Browse link): follow it.
  if (query !== renderedQuery) {
    setRenderedQuery(query);
    if (query !== requestedQuery) {
      setRequestedQuery(query);
      setValue(query);
    }
  }

  function search(nextQuery: string) {
    setRequestedQuery(nextQuery);
    startTransition(() => {
      router.replace(
        nextQuery ? `/browse?q=${encodeURIComponent(nextQuery)}` : "/browse",
        { scroll: false },
      );
    });
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
    // Clearing the field returns to Browse straight away rather than after the debounce.
    if (!normalizeSearchQuery(nextValue) && requestedQuery) search("");
  }

  function clear() {
    handleChange("");
    inputRef.current?.focus();
  }

  const showSkeleton = isPending && requestedQuery !== "";

  return (
    <>
      <form
        role="search"
        onSubmit={(event) => {
          event.preventDefault();
          const nextQuery = normalizeSearchQuery(value);
          if (nextQuery && nextQuery !== requestedQuery) search(nextQuery);
        }}
        className="mt-7 max-w-xl"
      >
        <label htmlFor="browse-search" className="sr-only">
          Search movies and shows
        </label>
        <div className="relative">
          <span className="pointer-events-none absolute top-1/2 left-3.5 flex -translate-y-1/2 text-muted">
            {isPending ? <SpinnerIcon className="size-4" /> : <SearchIcon className="size-4" />}
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
            className="h-11 w-full rounded-md border border-line bg-surface pr-11 pl-10 text-[0.9375rem] text-foreground transition-colors placeholder:text-muted/70 hover:border-muted/40 focus:border-accent/70 focus:outline-none [&::-webkit-search-cancel-button]:appearance-none"
          />
          {value && (
            <button
              type="button"
              onClick={clear}
              aria-label="Clear search"
              className="absolute top-1/2 right-2 flex size-7 -translate-y-1/2 items-center justify-center rounded-sm text-muted transition-colors hover:bg-elevated hover:text-foreground"
            >
              <XIcon className="size-4" />
            </button>
          )}
        </div>
      </form>

      <div className="mt-10">
        {showSkeleton ? <SearchResultsSkeleton query={requestedQuery} /> : children}
      </div>
    </>
  );
}
