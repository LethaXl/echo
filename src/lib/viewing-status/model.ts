import type { CatalogueItem } from "@/types/media";
import { selectWatchlist, type WatchlistSort } from "@/lib/watchlist/model";

// Display labels for the existing database values.
export const VIEWING_STATUSES = { watching: "Watching", completed: "Completed" } as const;
export type ViewingStatus = keyof typeof VIEWING_STATUSES;
export type ViewingFilter = "all" | ViewingStatus;
export type ViewingItem = CatalogueItem & {
  entryId: string;
  status: ViewingStatus;
  updatedAt: string;
  addedAt: string;
  unavailable: boolean;
};

export function validViewingStatus(status: unknown): status is ViewingStatus | null {
  return status === null || status === "watching" || status === "completed";
}

export function filterViewingActivity(items: ViewingItem[], query: string, status: ViewingFilter, sort: WatchlistSort = "recent") {
  return selectWatchlist(items.filter((item) => status === "all" || item.status === status), query, sort);
}
