import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { EMPTY_NOTE, ERROR_NOTE, SMALL_BUTTON } from "@/components/admin/content/styles";
import UserBrowser from "@/components/admin/users/UserBrowser";
import UserList from "@/components/admin/users/UserList";
import DetailsBackLink from "@/components/details/DetailsBackLink";
import { ChevronRightIcon } from "@/components/icons";
import { requireAdmin } from "@/lib/admin/access";
import { listUsers } from "@/lib/admin/user-queries";
import {
  MAX_USER_SEARCH_LENGTH,
  parseStatusFilter,
  USERS_PER_PAGE,
  usersHref,
  type AccountStatusFilter,
} from "@/lib/admin/users";
import { normalizeSearchQuery } from "@/lib/search";

export const metadata: Metadata = {
  title: "User Management",
  robots: { index: false, follow: false },
};

function param(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value)?.trim() ?? "";
}

function emptyMessage(query: string, status: AccountStatusFilter): string {
  const kind = status === "all" ? "accounts" : `${status} accounts`;
  return query ? `No ${kind} match “${query}”.` : `There are no ${kind} yet.`;
}

// US-61 to US-65 User Management
export default async function AdminUsersPage({ searchParams }: PageProps<"/admin/users">) {
  await requireAdmin("/admin/users");
  const params = await searchParams;
  const query = normalizeSearchQuery(param(params.q)).slice(0, MAX_USER_SEARCH_LENGTH);
  const status = parseStatusFilter(param(params.status));
  const page = Math.max(1, Math.min(Number.parseInt(param(params.page), 10) || 1, 10_000));

  const result = await listUsers({ query, status, page });
  const pageCount = result ? Math.max(1, Math.ceil(result.total / USERS_PER_PAGE)) : 1;
  const first = (page - 1) * USERS_PER_PAGE + 1;

  return (
    <div data-layout="wide" className="motion-safe:animate-fade-in-up">
      <div className="mx-auto w-full max-w-4xl">
        <DetailsBackLink href="/admin" label="Back to Admin Panel" />
        <h1 className="mt-5 text-2xl font-semibold tracking-tight">User Management</h1>

        <UserBrowser query={query} status={status}>
          {result === null ? (
            <p role="alert" className={ERROR_NOTE}>
              Accounts couldn&apos;t be loaded right now. Refresh the page to try again.
            </p>
          ) : result.users.length === 0 ? (
            <div className={EMPTY_NOTE}>
              <p>{page > 1 && result.total > 0 ? "There are no accounts on this page." : emptyMessage(query, status)}</p>
              {page > 1 && result.total > 0 && (
                <Link href={usersHref({ query, status })} className={`${SMALL_BUTTON} mt-4`}>
                  Go to page 1
                </Link>
              )}
            </div>
          ) : (
            <>
              <UserList users={result.users} />

              <nav aria-label="Pages" className="mt-4 flex items-center justify-between gap-4 px-1">
                <p className="text-[13px] text-muted tabular-nums">
                  {pageCount > 1 && `${first}–${first + result.users.length - 1} of `}
                  <span className="font-semibold text-accent">{result.total}</span>{" "}
                  {result.total === 1 ? "account" : "accounts"}
                </p>
                <div className="flex items-center gap-2">
                  <PageLink
                    label="Previous page"
                    href={page > 1 ? usersHref({ query, status, page: page - 1 }) : null}
                  >
                    <ChevronRightIcon className="size-4 rotate-180" />
                  </PageLink>
                  <span className="min-w-12 text-center text-[13px] text-muted tabular-nums">
                    <span className="sr-only">Page </span>
                    <span className="font-semibold text-foreground">{page}</span> / {pageCount}
                  </span>
                  <PageLink
                    label="Next page"
                    href={page < pageCount ? usersHref({ query, status, page: page + 1 }) : null}
                  >
                    <ChevronRightIcon className="size-4" />
                  </PageLink>
                </div>
              </nav>
            </>
          )}
        </UserBrowser>
      </div>
    </div>
  );
}

const PAGE_LINK =
  "flex size-8 items-center justify-center rounded-full border transition-colors duration-150";

function PageLink({ href, label, children }: { href: string | null; label: string; children: ReactNode }) {
  if (!href) {
    return (
      <span role="link" aria-disabled="true" aria-label={label} className={`${PAGE_LINK} border-line text-muted/40`}>
        {children}
      </span>
    );
  }
  return (
    <Link
      href={href}
      scroll={false}
      aria-label={label}
      className={`${PAGE_LINK} border-accent/30 bg-accent/10 text-accent hover:bg-accent hover:text-on-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60`}
    >
      {children}
    </Link>
  );
}
