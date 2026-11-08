import type { TmdbImageSize } from "@/lib/tmdb/images";

export type ViewerImage = { path: string | null; size: TmdbImageSize };

export type UpNext = {
  href: string;
  seasonNumber: number;
  episodeNumber: number;
  name: string;
  stillPath: string | null;
  runtimeMinutes: number | null;
};

/** Normalized content and navigation data for the simulated viewer. */
export type ViewerContent = {
  /** Changes with the movie or episode, so playback never carries over. */
  key: string;
  title: string;
  episode: { seasonNumber: number; episodeNumber: number; name: string } | null;
  backdrop: ViewerImage;
  runtimeSeconds: number;
  /** True when TMDB had no runtime and the fallback is used. */
  runtimeEstimated: boolean;
  detailsHref: string;
  detailsLabel: string;
  /** TV only: the next episode, or `null` at the end of what's available. */
  upNext: UpNext | null;
  /** TV only, when there's no next episode. */
  endMessage: string | null;
};
