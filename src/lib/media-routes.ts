import type { MediaReference } from "@/types/media";

export function titleHref({ mediaType, tmdbId }: MediaReference): string {
  return `/${mediaType}/${tmdbId}`;
}

export function seasonHref(showId: number, seasonNumber: number): string {
  return `/tv/${showId}/season/${seasonNumber}`;
}

export function watchMovieHref(movieId: number): string {
  return `/watch/movie/${movieId}`;
}

/** Opens the show's first available episode. */
export function watchShowHref(showId: number): string {
  return `/watch/tv/${showId}`;
}

export function watchEpisodeHref(showId: number, seasonNumber: number, episodeNumber: number): string {
  return `/watch/tv/${showId}/season/${seasonNumber}/episode/${episodeNumber}`;
}

/** Parses a non-negative whole number from a URL segment; anything else is `null`. */
export function parseRouteNumber(value: string): number | null {
  if (!/^\d{1,9}$/.test(value)) return null;
  return Number.parseInt(value, 10);
}
