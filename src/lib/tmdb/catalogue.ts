import "server-only";
import { isTmdbConfigured, tmdbFetch } from "@/lib/tmdb/client";
import type {
  TmdbMovieResult,
  TmdbPaginatedResponse,
  TmdbTrendingResult,
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

export function getTrending() {
  return loadSection("trending titles", async () => {
    const data = await tmdbFetch<TmdbPaginatedResponse<TmdbTrendingResult>>(
      "/trending/all/week",
      { language: LANGUAGE },
    );
    return data.results.flatMap((result) => {
      if (result.media_type === "movie") return [normalizeMovie(result)];
      if (result.media_type === "tv") return [normalizeTvShow(result)];
      return [];
    });
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
