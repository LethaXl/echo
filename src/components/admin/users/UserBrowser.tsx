"use client";

import { useRouter } from "next/navigation";
import { useEffect, useEffectEvent, useRef, useState, useTransition, type ReactNode } from "react";
import MediaSearchField from "@/components/media/MediaSearchField";
import {
  ACCOUNT_STATUS_FILTERS,
  MAX_USER_SEARCH_LENGTH,
  usersHref,
  type AccountStatusFilter,
} from "@/lib/admin/users";
import { normalizeSearchQuery } from "@/lib/search";
import { OpenAccountContext, type OpenAccount } from "./open-account";
import UserDetailsDialog from "./UserDetailsDialog";

const DEBOUNCE_MS = 300;

const FILTER_LABELS: Record<AccountStatusFilter, string> = {
  all: "All",
  active: "Active",
  deactivated: "Deactivated",
};

const searchable = (value: string) => normalizeSearchQuery(value).slice(0, MAX_USER_SEARCH_LENGTH);

type Search = { query: string; status: AccountStatusFilter };

/**
 * Live search and the status filter for /admin/users (US-62). Every change resets to page 1.
 * The details dialog lives here rather than in a row, so it stays open when a refresh after
 * deactivating moves the row off the current page or filter.
 */
export default function UserBrowser({
  query,
  status,
  children,
}: Search & { children: ReactNode }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState(query);
  const [requested, setRequested] = useState<Search>({ query, status });
  const [rendered, setRendered] = useState<Search>({ query, status });
  const [account, setAccount] = useState<OpenAccount | null>(null);
  const [isPending, startTransition] = useTransition();

  // The URL changed without us asking (Back/Forward): follow it.
  if (query !== rendered.query || status !== rendered.status) {
    setRendered({ query, status });
    if (query !== requested.query || status !== requested.status) {
      setRequested({ query, status });
      setValue(query);
    }
  }

  // The router shows only the latest navigation, so a slow response never replaces newer results.
  function navigate(next: Search) {
    setRequested(next);
    startTransition(() => router.replace(usersHref(next), { scroll: false }));
  }

  const onDebounced = useEffectEvent((nextQuery: string) => navigate({ query: nextQuery, status: requested.status }));

  useEffect(() => {
    const nextQuery = searchable(value);
    if (nextQuery === requested.query) return;
    const timer = setTimeout(() => onDebounced(nextQuery), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [value, requested.query]);

  return (
    <OpenAccountContext value={setAccount}>
      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <form
          role="search"
          className="min-w-0 flex-1 sm:max-w-sm"
          onSubmit={(event) => {
            event.preventDefault();
            const nextQuery = searchable(value);
            if (nextQuery !== requested.query) navigate({ query: nextQuery, status: requested.status });
          }}
        >
          <MediaSearchField
            inputRef={inputRef}
            label="Search username or email"
            placeholder="Search username or email..."
            value={value}
            onChange={setValue}
            onClear={() => {
              setValue("");
              if (requested.query) navigate({ query: "", status: requested.status });
              inputRef.current?.focus();
            }}
            pending={isPending}
          />
        </form>

        <div
          role="group"
          aria-label="Account status"
          className="flex h-9 shrink-0 self-start rounded-full border border-accent/30 bg-accent/10 p-[3px] sm:self-auto"
        >
          {ACCOUNT_STATUS_FILTERS.map((filter) => {
            const selected = requested.status === filter;
            return (
              <button
                key={filter}
                type="button"
                aria-pressed={selected}
                onClick={() => {
                  if (!selected) navigate({ query: searchable(value), status: filter });
                }}
                className={`rounded-full px-3.5 text-[13px] font-semibold transition-colors duration-150 ${
                  selected ? "bg-accent text-on-accent" : "text-muted hover:text-foreground"
                }`}
              >
                {FILTER_LABELS[filter]}
              </button>
            );
          })}
        </div>
      </div>

      <div
        aria-busy={isPending || undefined}
        className={`mt-5 transition-opacity duration-150 ${isPending ? "pointer-events-none opacity-60" : ""}`}
      >
        {children}
      </div>

      {account && (
        <UserDetailsDialog key={account.id} account={account} onClose={() => setAccount(null)} />
      )}
    </OpenAccountContext>
  );
}
