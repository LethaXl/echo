import "server-only";
import { normalizeMovie, normalizeTvShow } from "@/lib/tmdb/catalogue";
import { tmdbFetch, TmdbError } from "@/lib/tmdb/client";
import type { TmdbMovieResult, TmdbTvResult } from "@/lib/tmdb/types";
import type { CatalogueItem, MediaReference } from "@/types/media";

export async function getWatchlistMetadata(ref: MediaReference): Promise<CatalogueItem | null> {
  try {
    return ref.mediaType === "movie"
      ? normalizeMovie(await tmdbFetch<TmdbMovieResult>(`/movie/${ref.tmdbId}`, { language: "en-US" }))
      : normalizeTvShow(await tmdbFetch<TmdbTvResult>(`/tv/${ref.tmdbId}`, { language: "en-US" }));
  } catch (error) {
    if (error instanceof TmdbError && error.status === 404) return null;
    throw error;
  }
}
