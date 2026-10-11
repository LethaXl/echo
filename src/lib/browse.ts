import type { MediaType } from "@/types/media";

export type ContentType = "all" | MediaType;
export type BrowseSort = "popular" | "title" | "newest";

export type BrowseFilters = {
  type: ContentType;
  /** A genre slug from `GENRES`. */
  genre: string | null;
  year: number | null;
  sort: BrowseSort;
};

export const DEFAULT_FILTERS: BrowseFilters = { type: "all", genre: null, year: null, sort: "popular" };

export type Genre = { slug: string; label: string; movie: number | null; tv: number | null };

/**
 * Echo's genres mapped onto TMDB's separate movie and TV genre IDs. TV folds some genres together
 * ("Action & Adventure", "Sci-Fi & Fantasy", "War & Politics") and lacks others entirely, which is
 * `null` here.
 */
export const GENRES: Genre[] = [
  { slug: "action", label: "Action", movie: 28, tv: 10759 },
  { slug: "adventure", label: "Adventure", movie: 12, tv: 10759 },
  { slug: "animation", label: "Animation", movie: 16, tv: 16 },
  { slug: "comedy", label: "Comedy", movie: 35, tv: 35 },
  { slug: "crime", label: "Crime", movie: 80, tv: 80 },
  { slug: "documentary", label: "Documentary", movie: 99, tv: 99 },
  { slug: "drama", label: "Drama", movie: 18, tv: 18 },
  { slug: "family", label: "Family", movie: 10751, tv: 10751 },
  { slug: "fantasy", label: "Fantasy", movie: 14, tv: 10765 },
  { slug: "history", label: "History", movie: 36, tv: null },
  { slug: "horror", label: "Horror", movie: 27, tv: null },
  { slug: "kids", label: "Kids", movie: null, tv: 10762 },
  { slug: "music", label: "Music", movie: 10402, tv: null },
  { slug: "mystery", label: "Mystery", movie: 9648, tv: 9648 },
  { slug: "reality", label: "Reality", movie: null, tv: 10764 },
  { slug: "romance", label: "Romance", movie: 10749, tv: null },
  { slug: "science-fiction", label: "Sci-Fi", movie: 878, tv: 10765 },
  { slug: "thriller", label: "Thriller", movie: 53, tv: null },
  { slug: "war", label: "War", movie: 10752, tv: 10768 },
  { slug: "western", label: "Western", movie: 37, tv: 37 },
];

export function findGenre(slug: string | null): Genre | null {
  return GENRES.find((genre) => genre.slug === slug) ?? null;
}

/** The TMDB genre ID for a media type, or null when TMDB has no such genre for it. */
export function genreIdFor(slug: string | null, mediaType: MediaType): number | null {
  return findGenre(slug)?.[mediaType] ?? null;
}

export function genresFor(type: ContentType): Genre[] {
  return type === "all" ? GENRES : GENRES.filter((genre) => genre[type] !== null);
}

export const MIN_YEAR = 2000;

/** Newest first. */
export function releaseYears(): number[] {
  const current = new Date().getFullYear();
  return Array.from({ length: current - MIN_YEAR + 1 }, (_, index) => current - index);
}

export const SORT_LABELS: Record<BrowseSort, string> = {
  popular: "Most popular",
  title: "Title A–Z",
  newest: "Newest release",
};

/** Newest release is only offered across years, not within a chosen one. */
export function sortsFor(year: number | null): BrowseSort[] {
  const sorts = Object.keys(SORT_LABELS) as BrowseSort[];
  return year === null ? sorts : sorts.filter((sort) => sort !== "newest");
}

type SearchParams = Record<string, string | string[] | undefined>;

const single = (value: string | string[] | undefined) => (typeof value === "string" ? value : "");

/** Reads the filters from the URL, dropping anything invalid or that doesn't apply to the type. */
export function parseBrowseFilters(params: SearchParams): BrowseFilters {
  const typeParam = single(params.type);
  const type: ContentType = typeParam === "movie" || typeParam === "tv" ? typeParam : "all";

  const genreParam = single(params.genre);
  const genre = genresFor(type).some((option) => option.slug === genreParam) ? genreParam : null;

  const yearParam = Number.parseInt(single(params.year), 10);
  const year =
    yearParam >= MIN_YEAR && yearParam <= new Date().getFullYear() ? yearParam : null;

  const sortParam = single(params.sort);
  const sort = sortsFor(year).find((option) => option === sortParam) ?? "popular";

  return { type, genre, year, sort };
}

export function isFiltered(filters: BrowseFilters): boolean {
  return (
    filters.type !== DEFAULT_FILTERS.type ||
    filters.genre !== null ||
    filters.year !== null ||
    filters.sort !== DEFAULT_FILTERS.sort
  );
}

/** `/browse` with only the non-default parts of the state in the query string. */
export function browseHref(query: string, filters: BrowseFilters): string {
  const params = new URLSearchParams();
  if (query) params.set("q", query);
  if (filters.type !== "all") params.set("type", filters.type);
  if (filters.genre) params.set("genre", filters.genre);
  if (filters.year !== null) params.set("year", String(filters.year));
  if (filters.sort !== "popular") params.set("sort", filters.sort);
  const search = params.toString();
  return search ? `/browse?${search}` : "/browse";
}

const LAST_BROWSE_KEY = "echo:last-browse";

/** Remembers the Browse URL for this tab so the details pages can link back to it. */
export function rememberBrowseHref(href: string): void {
  try {
    sessionStorage.setItem(LAST_BROWSE_KEY, href);
  } catch {
    // Storage can be unavailable (private mode, disabled); the plain /browse link still works.
  }
}

export function readBrowseHref(): string {
  try {
    const href = sessionStorage.getItem(LAST_BROWSE_KEY);
    return href && /^\/browse(\?|$)/.test(href) ? href : "/browse";
  } catch {
    return "/browse";
  }
}
