import "server-only";
import { isTmdbConfigured, tmdbFetch } from "@/lib/tmdb/client";
import type {
  TmdbMovieResult,
  TmdbMultiResult,
  TmdbPaginatedResponse,
  TmdbTvResult,
} from "@/lib/tmdb/types";
import type { CatalogueItem, MediaReference } from "@/types/media";

const LANGUAGE = "en-US";

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

function searchMulti(query: string, page: number) {
  return tmdbFetch<TmdbPaginatedResponse<TmdbMultiResult>>("/search/multi", {
    query,
    language: LANGUAGE,
    include_adult: false,
    page,
  });
}

// US-15 Search by Title
export function searchTitles(query: string) {
  return loadSection("search results", async () => {
    const variant = pluralVariant(query);
    const pages = await Promise.all([
      ...Array.from({ length: SEARCH_PAGES }, (_, index) => searchMulti(query, index + 1)),
      ...(variant ? [searchMulti(variant, 1)] : []),
    ]);

    const target = comparableTitle(query);
    const seen = new Set<string>();
    return pages
      .flatMap((page) => page.results)
      .flatMap((result) => {
        if (result.media_type === "person" || seen.has(`${result.media_type}-${result.id}`)) {
          return [];
        }
        seen.add(`${result.media_type}-${result.id}`);
        const item = result.media_type === "movie" ? normalizeMovie(result) : normalizeTvShow(result);
        return [{ item, score: searchScore(result, item.title, target) }];
      })
      .sort((a, b) => b.score - a.score)
      .map(({ item }) => item);
  });
}

/** TMDB TV genre IDs for News, Reality and Talk, which otherwise dominate `/tv/popular`. */
const EXCLUDED_TV_GENRES = "10763,10764,10767";

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

const itemKey = (item: MediaReference) => `${item.mediaType}-${item.tmdbId}`;

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
