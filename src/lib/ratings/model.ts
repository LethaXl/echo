import type { CatalogueItem } from "@/types/media";
import type { ContentType } from "@/lib/browse";

export const RATING_LEVELS = [1, 2, 3, 4, 5] as const;
export type RatingValue = (typeof RATING_LEVELS)[number];
export const RATING_LABELS: Record<RatingValue, string> = {
  1: "Whisper", 2: "Faint Echo", 3: "Resonant", 4: "Powerful", 5: "Unforgettable",
};
export const RATING_SORTS = {
  recent: "Recently rated", oldest: "Oldest rated", highest: "Highest rated",
  lowest: "Lowest rated", az: "Title A–Z", za: "Title Z–A",
} as const;
export type RatingSort = keyof typeof RATING_SORTS;
export type RatedItem = CatalogueItem & {
  entryId: string;
  rating: RatingValue;
  ratedAt: string;
  unavailable: boolean;
};

export function validRating(value: unknown): value is RatingValue | null {
  return value === null || (typeof value === "number" && Number.isInteger(value) && value >= 1 && value <= 5);
}

export function selectRatedTitles(items: RatedItem[], query: string, sort: RatingSort, type: ContentType = "all") {
  const match = query.trim().toLocaleLowerCase("en");
  return items.filter((item) => (type === "all" || item.mediaType === type) &&
    item.title.toLocaleLowerCase("en").includes(match)).sort((a, b) => {
    const titleOrder = a.title.localeCompare(b.title, "en", { sensitivity: "base" });
    const recent = Date.parse(b.ratedAt) - Date.parse(a.ratedAt);
    const order = sort === "recent" ? recent : sort === "oldest" ? -recent
      : sort === "highest" ? b.rating - a.rating : sort === "lowest" ? a.rating - b.rating
        : sort === "za" ? -titleOrder : titleOrder;
    return order || titleOrder || `${a.mediaType}-${a.tmdbId}`.localeCompare(`${b.mediaType}-${b.tmdbId}`);
  });
}
