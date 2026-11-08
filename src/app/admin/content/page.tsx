import type { Metadata } from "next";
import Link from "next/link";
import ContentBrowser from "@/components/admin/content/ContentBrowser";
import ContentRow from "@/components/admin/content/ContentRow";
import { contentListHref } from "@/components/admin/content/hrefs";
import { EMPTY_NOTE, ERROR_NOTE, PANEL, SMALL_BUTTON } from "@/components/admin/content/styles";
import DetailsBackLink from "@/components/details/DetailsBackLink";
import { requireAdmin } from "@/lib/admin/access";
import { listManagedTitles, searchContent, type AdminTitle } from "@/lib/admin/content-queries";
import { normalizeSearchQuery } from "@/lib/search";

export const metadata: Metadata = {
  title: "Content Management",
  robots: { index: false, follow: false },
};

type ContentPageProps = PageProps<"/admin/content">;

function param(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value)?.trim() ?? "";
}

function TitleList({ titles, empty }: { titles: AdminTitle[] | null; empty: string }) {
  if (titles === null) {
    return (
      <p role="alert" className={ERROR_NOTE}>
        This list couldn&apos;t be loaded right now. Refresh the page to try again.
      </p>
    );
  }
  if (titles.length === 0) return <p className={EMPTY_NOTE}>{empty}</p>;
  return (
    <ul className={`${PANEL} divide-y divide-line overflow-hidden`}>
      {titles.map((title) => (
        <ContentRow key={`${title.mediaType}-${title.tmdbId}`} title={title} />
      ))}
    </ul>
  );
}

// US-50 to US-57 Content Management
export default async function AdminContentPage({ searchParams }: ContentPageProps) {
  await requireAdmin("/admin/content");
  const params = await searchParams;
  const query = normalizeSearchQuery(param(params.q));
  const page = Math.max(1, Math.min(Number.parseInt(param(params.page), 10) || 1, 500));

  const [results, recent] = await Promise.all([
    query ? searchContent(query) : null,
    query ? null : listManagedTitles(page),
  ]);

  return (
    <div data-layout="wide" className="motion-safe:animate-fade-in-up max-md:[overflow-wrap:anywhere] max-md:[&>a:first-child]:min-h-11 max-md:[&>div>a:first-child]:min-h-11">
      <div className="mx-auto w-full max-w-4xl">
        <DetailsBackLink href="/admin" label="Back to Admin Panel" />
        <h1 className="mt-5 text-2xl font-semibold tracking-tight max-md:mt-3">Content Management</h1>


        <ContentBrowser query={query}>
          {query ? (
            <section aria-labelledby="results-heading">
              <h2 id="results-heading" className="mb-3 text-sm text-muted">
                {results?.length
                  ? `${results.length} ${results.length === 1 ? "result" : "results"} for `
                  : "Results for "}
                <span className="text-foreground">&ldquo;{query}&rdquo;</span>
              </h2>
              <TitleList titles={results} empty={`Nothing matches “${query}”. Try another title.`} />
            </section>
          ) : (
            <section aria-labelledby="recent-heading">
              <h2 id="recent-heading" className="mb-3 text-sm text-muted">
                Recently added, edited or hidden
              </h2>
              <TitleList
                titles={recent?.titles ?? null}
                empty="Nothing has been added, edited or hidden yet. Search above to find a title."
              />
              {recent && (page > 1 || recent.hasMore) && (
                <nav aria-label="Pages" className="mt-4 flex items-center justify-between">
                  {page > 1 ? (
                    <Link href={contentListHref({ page: page - 1 })} className={SMALL_BUTTON}>
                      Previous
                    </Link>
                  ) : (
                    <span />
                  )}
                  <span className="text-xs text-muted">Page {page}</span>
                  {recent.hasMore ? (
                    <Link href={contentListHref({ page: page + 1 })} className={SMALL_BUTTON}>
                      Next
                    </Link>
                  ) : (
                    <span />
                  )}
                </nav>
              )}
            </section>
          )}
        </ContentBrowser>
      </div>
    </div>
  );
}
