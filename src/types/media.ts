export type MediaType = "movie" | "tv";

/** How Echo's Supabase records point at TMDB content (metadata itself stays in TMDB). */
export type MediaReference = {
  tmdbId: number;
  mediaType: MediaType;
};
