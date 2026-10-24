import type { CatalogueItem, MediaReference } from "@/types/media";
import type { ContentType } from "@/lib/browse";

export type WatchlistItem = CatalogueItem & {
  entryId: string;
  addedAt: string;
  unavailable?: boolean;
};

export const WATCHLIST_SORTS = {
  recent: "Recently added",
  oldest: "Oldest added",
  az: "Title A–Z",
  newest: "Newest Release",
} as const;
export type WatchlistSort = keyof typeof WATCHLIST_SORTS;

export function validReference(id: unknown, type: unknown): boolean {
  return typeof id === "number" && Number.isInteger(id) && id > 0 && id <= 2147483647 &&
    (type === "movie" || type === "tv");
}

export function watchlistKey(item: MediaReference): string {
  return `${item.mediaType}-${item.tmdbId}`;
}

export function selectWatchlist<T extends WatchlistItem>(items: T[], query: string, sort: WatchlistSort, type: ContentType = "all") {
  const match = query.trim().toLocaleLowerCase("en");
  return items.filter((item) => (type === "all" || item.mediaType === type) &&
    item.title.toLocaleLowerCase("en").includes(match)).sort((a, b) => {
    const titleOrder = a.title.localeCompare(b.title, "en", { sensitivity: "base" });
    const recent = Date.parse(b.addedAt) - Date.parse(a.addedAt);
    let order = 0;
    if (sort === "az") order = titleOrder;
    else if (sort === "oldest") order = -recent;
    else if (sort === "recent") order = recent;
    else {
      // Unknown release years stay last.
      if (a.year === null && b.year !== null) return 1;
      if (b.year === null && a.year !== null) return -1;
      order = (b.year ?? 0) - (a.year ?? 0);
    }
    return order || titleOrder || watchlistKey(a).localeCompare(watchlistKey(b));
  });
}
