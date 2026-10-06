export type MediaType = "movie" | "tv";

/** How Echo's Supabase records point at TMDB content (metadata itself stays in TMDB). */
export type MediaReference = {
  tmdbId: number;
  mediaType: MediaType;
};

/** A movie or TV show normalized for catalogue listings. */
export type CatalogueItem = MediaReference & {
  title: string;
  year: number | null;
  posterPath: string | null;
  /** TMDB's public vote average (0-10), or null when the title has no votes. */
  tmdbRating: number | null;
};

export type CastMember = {
  id: number;
  name: string;
  character: string;
  profilePath: string | null;
};

type TitleDetailsBase = CatalogueItem & {
  backdropPath: string | null;
  tagline: string | null;
  overview: string | null;
  genres: string[];
  /** Local content rating such as "PG-13" or "TV-MA" (US ratings). */
  certification: string | null;
  tmdbVoteCount: number;
  status: string | null;
  originalLanguage: string | null;
  cast: CastMember[];
};

export type MovieDetails = TitleDetailsBase & {
  mediaType: "movie";
  releaseDate: string | null;
  /** Minutes. */
  runtime: number | null;
  directors: string[];
};

export type SeasonSummary = {
  seasonNumber: number;
  name: string;
  year: number | null;
  episodeCount: number;
  posterPath: string | null;
};

export type TvShowDetails = TitleDetailsBase & {
  mediaType: "tv";
  firstAirDate: string | null;
  lastAirDate: string | null;
  /** Typical episode length in minutes. */
  episodeRuntime: number | null;
  creators: string[];
  networks: string[];
  seasonCount: number;
  episodeCount: number;
  /** Numbered seasons first, then Specials (season 0) if TMDB has any. */
  seasons: SeasonSummary[];
};

export type Episode = {
  id: number;
  episodeNumber: number;
  name: string;
  overview: string | null;
  airDate: string | null;
  /** Minutes. */
  runtime: number | null;
  stillPath: string | null;
};

export type SeasonDetails = {
  seasonNumber: number;
  name: string;
  overview: string | null;
  year: number | null;
  posterPath: string | null;
  episodes: Episode[];
};
