import "server-only";
import { applyCatalogueOverrides, getTitleRule } from "@/lib/content/rules";
import { normalizeMovie, normalizeTvShow } from "@/lib/tmdb/catalogue";
import { tmdbFetch, TmdbError } from "@/lib/tmdb/client";
import type { TmdbMovieResult, TmdbTvResult } from "@/lib/tmdb/types";
import type { CatalogueItem, MediaReference } from "@/types/media";

async function fetchTmdbItem(ref: MediaReference): Promise<CatalogueItem | null> {
  try {
    return ref.mediaType === "movie"
      ? normalizeMovie(await tmdbFetch<TmdbMovieResult>(`/movie/${ref.tmdbId}`, { language: "en-US" }))
      : normalizeTvShow(await tmdbFetch<TmdbTvResult>(`/tv/${ref.tmdbId}`, { language: "en-US" }));
  } catch (error) {
    if (error instanceof TmdbError && error.status === 404) return null;
    throw error;
  }
}

/**
 * A saved title as Echo shows it, or `null` when it's gone from TMDB or an admin hid it, so it
 * stays listed (and removable) but can't be acted on. Lists should call `prefetchTitleRules`
 * first so this doesn't query the database once per title.
 */
export async function getWatchlistMetadata(ref: MediaReference): Promise<CatalogueItem | null> {
  const [item, rule] = await Promise.all([fetchTmdbItem(ref), getTitleRule(ref)]);
  if (!item || rule?.hidden) return null;
  return rule ? applyCatalogueOverrides(item, rule.overrides) : item;
}
