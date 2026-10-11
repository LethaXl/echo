import "server-only";
import {
  type BrowseFilters,
  type BrowseSort,
  DEFAULT_FILTERS,
  genreIdFor,
} from "@/lib/browse";
import { isTmdbConfigured, tmdbFetch } from "@/lib/tmdb/client";
import type {
  TmdbMovieResult,
  TmdbMultiResult,
  TmdbPaginatedResponse,
  TmdbTvResult,
} from "@/lib/tmdb/types";
import type { CatalogueItem, MediaReference, MediaType } from "@/types/media";

const LANGUAGE = "en-US";

/** TMDB TV genre IDs for News, Reality and Talk, which otherwise dominate `/tv/popular`. */
const EXCLUDED_TV_GENRES = "10763,10764,10767";

const itemKey = (item: MediaReference) => `${item.mediaType}-${item.tmdbId}`;

export function parseYear(date: string | null | undefined): number | null {
  const year = Number.parseInt(date?.slice(0, 4) ?? "", 10);
  return Number.isFinite(year) ? year : null;
}

export function parseRating(voteAverage: number | undefined): number | null {
  return voteAverage ? Math.round(voteAverage * 10) / 10 : null;
}

export function normalizeMovie(movie: TmdbMovieResult): CatalogueItem {
  return {
    tmdbId: movie.id,
    mediaType: "movie",
    title: movie.title,
    year: parseYear(movie.release_date),
    posterPath: movie.poster_path,
    tmdbRating: parseRating(movie.vote_average),
  };
}

export function normalizeTvShow(show: TmdbTvResult): CatalogueItem {
  return {
    tmdbId: show.id,
    mediaType: "tv",
    title: show.name,
    year: parseYear(show.first_air_date),
    posterPath: show.poster_path,
    tmdbRating: parseRating(show.vote_average),
  };
}

function interleave<T>(first: T[], second: T[]): T[] {
  return Array.from({ length: Math.max(first.length, second.length) }, (_, index) => [
    first[index],
    second[index],
  ])
    .flat()
    .filter((item): item is T => item !== undefined);
}

/** Returns `null` instead of throwing so one failed section never breaks the page. */
async function loadSection(
  label: string,
  load: () => Promise<CatalogueItem[]>,
): Promise<CatalogueItem[] | null> {
  if (!isTmdbConfigured()) return null;
  try {
    return await load();
  } catch (error) {
    console.error(`Failed to load ${label}:`, error instanceof Error ? error.message : error);
    return null;
  }
}

/** Keeps movies and TV shows, dropping people. */
function normalizeTitles(results: TmdbMultiResult[]): CatalogueItem[] {
  return results.flatMap((result) => {
    if (result.media_type === "movie") return [normalizeMovie(result)];
    if (result.media_type === "tv") return [normalizeTvShow(result)];
    return [];
  });
}

export function getTrending() {
  return loadSection("trending titles", async () => {
    const data = await tmdbFetch<TmdbPaginatedResponse<TmdbMultiResult>>("/trending/all/week", {
      language: LANGUAGE,
    });
    return normalizeTitles(data.results);
  });
}

const SEARCH_PAGES = 2;

/** Lowercase, accent- and punctuation-free, without a leading article: "The Avengers" -> "avengers". */
function comparableTitle(title: string): string {
  return title
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/^(the|a|an) /, "");
}

/**
 * Higher is better. TMDB orders `/search/multi` by text relevance alone, which surfaces obscure
 * exact matches above the titles people usually mean, so popularity and vote count lead and a
 * close title match only nudges. Titles without a poster sink to the end.
 */
function searchScore(
  result: TmdbMovieResult | TmdbTvResult,
  title: string,
  query: string,
): number {
  const candidate = comparableTitle(title);
  const match =
    candidate === query
      ? 1.5
      : candidate.startsWith(query)
        ? 1
        : candidate.includes(query)
          ? 0.5
          : 0;
  return (
    Math.log1p(result.popularity ?? 0) +
    0.35 * Math.log1p(result.vote_count ?? 0) +
    match -
    (result.poster_path ? 0 : 3)
  );
}

/**
 * TMDB matches whole words only, so "avenger" never finds "The Avengers". Returns the query with
 * its last word made plural (or singular), or null when that doesn't apply.
 */
function pluralVariant(query: string): string | null {
  if (!/[a-z]{3,}$/i.test(query)) return null;
  return /s$/i.test(query) ? query.slice(0, -1) : `${query}s`;
}

/** A listed title plus the raw TMDB fields Browse filters and sorts on. */
type Candidate = {
  item: CatalogueItem;
  /** "YYYY-MM-DD", or null when TMDB has no date. */
  date: string | null;
  genreIds: number[];
  popularity: number;
  score: number;
  /** Whether the shown title is also the original one, which TMDB's A–Z ordering uses. */
  originalTitle: boolean;
};

function movieCandidate(result: TmdbMovieResult, query = ""): Candidate {
  const item = normalizeMovie(result);
  return {
    item,
    date: result.release_date || null,
    genreIds: result.genre_ids ?? [],
    popularity: result.popularity ?? 0,
    score: query ? searchScore(result, item.title, query) : 0,
    originalTitle: (result.original_title ?? result.title) === result.title,
  };
}

function tvCandidate(result: TmdbTvResult, query = ""): Candidate {
  const item = normalizeTvShow(result);
  return {
    item,
    date: result.first_air_date || null,
    genreIds: result.genre_ids ?? [],
    popularity: result.popularity ?? 0,
    score: query ? searchScore(result, item.title, query) : 0,
    originalTitle: (result.original_name ?? result.name) === result.name,
  };
}

function matchesFilters({ item, genreIds }: Candidate, filters: BrowseFilters): boolean {
  if (filters.type !== "all" && item.mediaType !== filters.type) return false;
  // Titles without a release date can't be placed in a year.
  if (filters.year !== null && item.year !== filters.year) return false;
  if (filters.genre) {
    const genreId = genreIdFor(filters.genre, item.mediaType);
    if (genreId === null || !genreIds.includes(genreId)) return false;
  }
  return true;
}

const today = () => new Date().toISOString().slice(0, 10);

const titleCollator = new Intl.Collator("en", {
  sensitivity: "base",
  numeric: true,
  ignorePunctuation: true,
});

/**
 * Null for "popular", which keeps the incoming order. "newest" puts released titles newest first,
 * then upcoming and undated ones, so unreleased titles don't crowd out what's already out.
 */
function candidateComparator(sort: BrowseSort): ((a: Candidate, b: Candidate) => number) | null {
  if (sort === "title") return (a, b) => titleCollator.compare(a.item.title, b.item.title);
  if (sort === "newest") {
    const cutoff = today();
    const rank = ({ date }: Candidate) => (date === null ? 2 : date > cutoff ? 1 : 0);
    return (a, b) =>
      rank(a) - rank(b) || (b.date ?? "").localeCompare(a.date ?? "") || b.popularity - a.popularity;
  }
  return null;
}

function sortCandidates(candidates: Candidate[], sort: BrowseSort): Candidate[] {
  const compare = candidateComparator(sort);
  return compare ? candidates.toSorted(compare) : candidates;
}

function uniqueCandidates(candidates: Candidate[]): Candidate[] {
  const seen = new Set<string>();
  return candidates.filter(({ item }) => {
    const key = itemKey(item);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function searchByType(
  mediaType: MediaType,
  query: string,
  page: number,
  year: number | null,
  target: string,
): Promise<Candidate[]> {
  const params = { query, language: LANGUAGE, include_adult: false, page };
  if (mediaType === "movie") {
    const data = await tmdbFetch<TmdbPaginatedResponse<TmdbMovieResult>>("/search/movie", {
      ...params,
      primary_release_year: year ?? undefined,
    });
    return data.results.map((result) => movieCandidate(result, target));
  }
  const data = await tmdbFetch<TmdbPaginatedResponse<TmdbTvResult>>("/search/tv", {
    ...params,
    first_air_date_year: year ?? undefined,
  });
  return data.results.map((result) => tvCandidate(result, target));
}

async function searchAll(query: string, page: number, target: string): Promise<Candidate[]> {
  const data = await tmdbFetch<TmdbPaginatedResponse<TmdbMultiResult>>("/search/multi", {
    query,
    language: LANGUAGE,
    include_adult: false,
    page,
  });
  return data.results.flatMap((result) => {
    if (result.media_type === "movie") return [movieCandidate(result, target)];
    if (result.media_type === "tv") return [tvCandidate(result, target)];
    return [];
  });
}

/**
 * US-15 Search by Title, US-21 Combine Search and Filters.
 *
 * `/search/multi` takes no type or year, so those switch to `/search/movie` and `/search/tv`,
 * which do. No search endpoint takes a genre, so genre is matched on each result's genre IDs.
 */
export function searchTitles(query: string, filters: BrowseFilters = DEFAULT_FILTERS) {
  return loadSection("search results", async () => {
    const target = comparableTitle(query);
    const variant = pluralVariant(query);
    const requests = [
      ...Array.from({ length: SEARCH_PAGES }, (_, index) => ({ text: query, page: index + 1 })),
      ...(variant ? [{ text: variant, page: 1 }] : []),
    ];
    const types: MediaType[] = filters.type === "all" ? ["movie", "tv"] : [filters.type];
    const useMulti = filters.type === "all" && filters.year === null;

    const pages = await Promise.all(
      requests.flatMap(({ text, page }) =>
        useMulti
          ? [searchAll(text, page, target)]
          : types.map((mediaType) => searchByType(mediaType, text, page, filters.year, target)),
      ),
    );

    const matches = uniqueCandidates(pages.flat())
      .filter((candidate) => matchesFilters(candidate, filters))
      .sort((a, b) => b.score - a.score);
    return sortCandidates(matches, filters.sort).map(({ item }) => item);
  });
}

/** A–Z gets a page more so it reaches past the titles starting with digits. */
const DISCOVER_PAGES: Record<BrowseSort, number> = { popular: 2, newest: 2, title: 3 };

const DISCOVER_SORT: Record<MediaType, Record<BrowseSort, string>> = {
  movie: { popular: "popularity.desc", title: "title.asc", newest: "primary_release_date.desc" },
  tv: { popular: "popularity.desc", title: "name.asc", newest: "first_air_date.desc" },
};

/** Keeps near-empty TMDB entries out, which matters most for newest-first. */
const DISCOVER_MIN_VOTES: Record<MediaType, number> = { movie: 10, tv: 5 };

/**
 * TMDB's full alphabetical list is dominated by barely-rated titles, so A–Z is the alphabetical
 * list of titles people have actually rated. Within a single year far fewer titles qualify.
 */
const TITLE_SORT_MIN_VOTES: Record<"anyYear" | "oneYear", Record<MediaType, number>> = {
  anyYear: { movie: 1000, tv: 300 },
  oneYear: { movie: 100, tv: 50 },
};

function minVotes(mediaType: MediaType, filters: BrowseFilters): number {
  if (filters.sort !== "title") return DISCOVER_MIN_VOTES[mediaType];
  return TITLE_SORT_MIN_VOTES[filters.year === null ? "anyYear" : "oneYear"][mediaType];
}

type DiscoverPage = { candidates: Candidate[]; hasMore: boolean };

async function discoverByType(
  mediaType: MediaType,
  filters: BrowseFilters,
  page: number,
): Promise<DiscoverPage> {
  const genre = genreIdFor(filters.genre, mediaType);
  // Only newest is capped at today: unreleased titles would otherwise fill the whole list.
  const releasedBy = filters.sort === "newest" ? today() : undefined;
  const params = {
    language: LANGUAGE,
    include_adult: false,
    sort_by: DISCOVER_SORT[mediaType][filters.sort],
    "vote_count.gte": minVotes(mediaType, filters),
    with_genres: genre ?? undefined,
    page,
  };

  if (mediaType === "movie") {
    const data = await tmdbFetch<TmdbPaginatedResponse<TmdbMovieResult>>("/discover/movie", {
      ...params,
      primary_release_year: filters.year ?? undefined,
      "primary_release_date.lte": releasedBy,
    });
    return {
      candidates: data.results.map((result) => movieCandidate(result)),
      hasMore: data.page < data.total_pages,
    };
  }
  const data = await tmdbFetch<TmdbPaginatedResponse<TmdbTvResult>>("/discover/tv", {
    ...params,
    first_air_date_year: filters.year ?? undefined,
    "first_air_date.lte": releasedBy,
    include_null_first_air_dates: false,
    // News and Talk stay out; Reality only when it's the genre asked for.
    without_genres: filters.genre === "reality" ? "10763,10767" : EXCLUDED_TV_GENRES,
  });
  return {
    candidates: data.results.map((result) => tvCandidate(result)),
    hasMore: data.page < data.total_pages,
  };
}

/**
 * US-16 to US-20: filtered, sorted titles without a search, from TMDB's discover endpoints,
 * which apply type, genre, year and sort across TMDB's whole catalogue. A genre that doesn't
 * exist for a type (e.g. Horror for TV) skips that type instead of requesting everything.
 */
export function discoverTitles(filters: BrowseFilters) {
  return loadSection("filtered titles", async () => {
    const types = (filters.type === "all" ? (["movie", "tv"] as const) : [filters.type]).filter(
      (mediaType) => filters.genre === null || genreIdFor(filters.genre, mediaType) !== null,
    );
    const lists = await Promise.all(
      types.map(async (mediaType) => {
        const pages = await Promise.all(
          Array.from({ length: DISCOVER_PAGES[filters.sort] }, (_, index) =>
            discoverByType(mediaType, filters, index + 1),
          ),
        );
        return {
          candidates: pages.flatMap((page) => page.candidates),
          hasMore: pages.at(-1)?.hasMore ?? false,
        };
      }),
    );

    const matches = uniqueCandidates(lists.flatMap((list) => list.candidates)).filter(
      (candidate) => matchesFilters(candidate, filters),
    );
    const compare = candidateComparator(filters.sort);
    if (!compare) {
      // Movies and shows arrive as two separately sorted lists; merge them by popularity.
      return matches.toSorted((a, b) => b.popularity - a.popularity).map(({ item }) => item);
    }

    // Each list is only the first pages of TMDB's order, so anything sorting after the last title
    // of a list with more pages could be preceded by titles that weren't fetched. Cutting there
    // keeps the merged list in true order across movies and shows. TMDB's A–Z goes by original
    // title, so only titles shown under their original name mark how far it got.
    const boundaries = lists.flatMap(({ candidates, hasMore }) => {
      const last = candidates.findLast(
        (candidate) => filters.sort !== "title" || candidate.originalTitle,
      );
      return hasMore && last ? [last] : [];
    });
    const cutoff = boundaries.toSorted(compare)[0];
    return matches
      .toSorted(compare)
      .filter((candidate) => !cutoff || compare(candidate, cutoff) <= 0)
      .map(({ item }) => item);
  });
}

const ECHO_PICKS_YEARS = 5;

/**
 * Echo Picks: the highest-rated movies and TV shows of recent years on TMDB, alternated.
 * Vote-count floors keep barely-rated titles out. Not personalized.
 */
export function getEchoPicks() {
  return loadSection("Echo Picks", async () => {
    const since = `${new Date().getFullYear() - ECHO_PICKS_YEARS}-01-01`;
    const [movies, shows] = await Promise.all([
      tmdbFetch<TmdbPaginatedResponse<TmdbMovieResult>>("/discover/movie", {
        language: LANGUAGE,
        sort_by: "vote_average.desc",
        include_adult: false,
        "vote_count.gte": 1000,
        "primary_release_date.gte": since,
      }),
      tmdbFetch<TmdbPaginatedResponse<TmdbTvResult>>("/discover/tv", {
        language: LANGUAGE,
        sort_by: "vote_average.desc",
        include_adult: false,
        without_genres: EXCLUDED_TV_GENRES,
        "vote_count.gte": 300,
        "first_air_date.gte": since,
      }),
    ]);
    return interleave(
      movies.results.slice(0, 10).map(normalizeMovie),
      shows.results.slice(0, 10).map(normalizeTvShow),
    );
  });
}

const ECHO_TRAIL_LENGTH = 5;

/** TMDB recommendations for a title, falling back to TMDB's "similar" list when empty. */
async function getRelatedOf<T>(
  basePath: string,
  normalize: (result: T) => CatalogueItem,
): Promise<CatalogueItem[]> {
  for (const relation of ["recommendations", "similar"]) {
    const data = await tmdbFetch<TmdbPaginatedResponse<T>>(`${basePath}/${relation}`, {
      language: LANGUAGE,
    });
    if (data.results.length > 0) return data.results.map(normalize);
  }
  return [];
}

function getRelatedTitles(title: MediaReference): Promise<CatalogueItem[]> {
  return title.mediaType === "movie"
    ? getRelatedOf(`/movie/${title.tmdbId}`, normalizeMovie)
    : getRelatedOf(`/tv/${title.tmdbId}`, normalizeTvShow);
}

/**
 * An Echo Trail: starting from one title, each step is the first not-yet-seen title in the
 * previous step's TMDB recommendations. Built purely from content relationships.
 *
 * Returns the titles after the start, which may be fewer than requested (or empty) when TMDB
 * has nothing more to offer or a request fails part-way.
 */
export async function getEchoTrail(start: CatalogueItem): Promise<CatalogueItem[]> {
  const trail: CatalogueItem[] = [];
  if (!isTmdbConfigured()) return trail;

  const seen = new Set([itemKey(start)]);
  let current: CatalogueItem = start;
  try {
    while (trail.length < ECHO_TRAIL_LENGTH - 1) {
      const related = await getRelatedTitles(current);
      const next = related.find((item) => item.posterPath && !seen.has(itemKey(item)));
      if (!next) break;
      seen.add(itemKey(next));
      trail.push(next);
      current = next;
    }
  } catch (error) {
    console.error("Failed to build Echo Trail:", error instanceof Error ? error.message : error);
  }
  return trail;
}

/** Specific titles by TMDB ID, in the order given. */
export function getTitles(references: MediaReference[]) {
  return loadSection("selected titles", () =>
    Promise.all(
      references.map(({ mediaType, tmdbId }) =>
        mediaType === "movie"
          ? tmdbFetch<TmdbMovieResult>(`/movie/${tmdbId}`, { language: LANGUAGE }).then(normalizeMovie)
          : tmdbFetch<TmdbTvResult>(`/tv/${tmdbId}`, { language: LANGUAGE }).then(normalizeTvShow),
      ),
    ),
  );
}

export function getPopularMovies() {
  return loadSection("popular movies", async () => {
    const data = await tmdbFetch<TmdbPaginatedResponse<TmdbMovieResult>>("/movie/popular", {
      language: LANGUAGE,
    });
    return data.results.map(normalizeMovie);
  });
}

export function getPopularTvShows() {
  return loadSection("popular TV shows", async () => {
    const data = await tmdbFetch<TmdbPaginatedResponse<TmdbTvResult>>("/discover/tv", {
      language: LANGUAGE,
      sort_by: "popularity.desc",
      include_adult: false,
      without_genres: EXCLUDED_TV_GENRES,
      "vote_count.gte": 200,
    });
    return data.results.map(normalizeTvShow);
  });
}
