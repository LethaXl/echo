"use client";

import { useRouter } from "next/navigation";
import { useEffect, useEffectEvent, useRef, useState, useTransition, type ReactNode } from "react";
import MediaSearchField from "@/components/media/MediaSearchField";
import { normalizeSearchQuery } from "@/lib/search";
import AddContentButton from "./AddContentButton";
import { contentListHref } from "./hrefs";

const DEBOUNCE_MS = 300;
/** Shorter searches match too much of TMDB to be useful. */
const MIN_QUERY_LENGTH = 2;

const searchable = (value: string) => {
  const query = normalizeSearchQuery(value);
  return query.length >= MIN_QUERY_LENGTH ? query : "";
};

/** Live search over movies and TV shows, and Add Content, for /admin/content. */
export default function ContentBrowser({ query, children }: { query: string; children: ReactNode }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState(query);
  const [requestedQuery, setRequestedQuery] = useState(query);
  const [renderedQuery, setRenderedQuery] = useState(query);
  const [isPending, startTransition] = useTransition();

  // The URL changed without us asking (Back/Forward): follow it.
  if (query !== renderedQuery) {
    setRenderedQuery(query);
    if (query !== requestedQuery) {
      setRequestedQuery(query);
      setValue(query);
    }
  }

  // Navigations run in a transition, and the router only shows the latest one, so a slow
  // response never replaces newer results.
  function navigate(nextQuery: string) {
    setRequestedQuery(nextQuery);
    startTransition(() => router.replace(contentListHref({ query: nextQuery }), { scroll: false }));
  }

  const onDebounced = useEffectEvent(navigate);

  useEffect(() => {
    const nextQuery = searchable(value);
    if (!nextQuery || nextQuery === requestedQuery) return;
    const timer = setTimeout(() => onDebounced(nextQuery), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [value, requestedQuery]);

  function handleChange(nextValue: string) {
    setValue(nextValue);
    // Clearing the field goes back to the recent list straight away.
    if (!normalizeSearchQuery(nextValue) && requestedQuery) navigate("");
  }

  return (
    <>
      <div className="mt-6 flex items-center gap-3">
        <form
          role="search"
          className="min-w-0 flex-1 sm:max-w-md"
          onSubmit={(event) => {
            event.preventDefault();
            const nextQuery = searchable(value);
            if (nextQuery && nextQuery !== requestedQuery) navigate(nextQuery);
          }}
        >
          <MediaSearchField
            inputRef={inputRef}
            label="Search movies and TV shows"
            placeholder="Search movies and TV shows..."
            value={value}
            onChange={handleChange}
            onClear={() => {
              handleChange("");
              inputRef.current?.focus();
            }}
            pending={isPending}
          />
        </form>
        <AddContentButton />
      </div>

      <div
        aria-busy={isPending || undefined}
        className={`mt-6 transition-opacity duration-150 ${isPending ? "pointer-events-none opacity-60" : ""}`}
      >
        {children}
      </div>
    </>
  );
}
