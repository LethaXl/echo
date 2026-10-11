/** Raw TMDB response shapes. Only the fields Echo reads are typed. */

export type TmdbPaginatedResponse<T> = {
  page: number;
  results: T[];
  total_pages: number;
  total_results: number;
};

export type TmdbMovieResult = {
  id: number;
  title: string;
  original_title?: string;
  release_date?: string;
  poster_path: string | null;
  vote_average?: number;
  vote_count?: number;
  popularity?: number;
  /** Present on list results (search, discover), not on `/movie/{id}`. */
  genre_ids?: number[];
};

export type TmdbTvResult = {
  id: number;
  name: string;
  original_name?: string;
  first_air_date?: string;
  poster_path: string | null;
  vote_average?: number;
  vote_count?: number;
  popularity?: number;
  /** Present on list results (search, discover), not on `/tv/{id}`. */
  genre_ids?: number[];
};

type TmdbNamed = { id: number; name: string };

export type TmdbCredits = {
  cast: {
    id: number;
    name: string;
    character: string;
    profile_path: string | null;
    order: number;
  }[];
  crew: { id: number; name: string; job: string }[];
};

/** `/movie/{id}?append_to_response=credits,release_dates` */
export type TmdbMovieDetails = TmdbMovieResult & {
  backdrop_path: string | null;
  tagline: string;
  overview: string;
  runtime: number | null;
  genres: TmdbNamed[];
  vote_count: number;
  status: string;
  original_language: string;
  credits: TmdbCredits;
  release_dates: {
    results: {
      iso_3166_1: string;
      release_dates: { certification: string; type: number }[];
    }[];
  };
};

export type TmdbSeasonSummary = {
  id: number;
  season_number: number;
  name: string;
  air_date: string | null;
  episode_count: number;
  poster_path: string | null;
};

/** `/tv/{id}?append_to_response=credits,content_ratings` */
export type TmdbTvDetails = TmdbTvResult & {
  backdrop_path: string | null;
  tagline: string;
  overview: string;
  last_air_date: string | null;
  genres: TmdbNamed[];
  vote_count: number;
  status: string;
  original_language: string;
  created_by: TmdbNamed[];
  networks: TmdbNamed[];
  number_of_seasons: number;
  number_of_episodes: number;
  episode_run_time: number[];
  seasons: TmdbSeasonSummary[];
  credits: TmdbCredits;
  content_ratings: { results: { iso_3166_1: string; rating: string }[] };
};

/** `/tv/{id}/season/{season_number}` */
export type TmdbSeasonDetails = {
  id: number;
  season_number: number;
  name: string;
  overview: string;
  air_date: string | null;
  poster_path: string | null;
  episodes: {
    id: number;
    episode_number: number;
    name: string;
    overview: string;
    air_date: string | null;
    runtime: number | null;
    still_path: string | null;
  }[];
};

/** `/trending/all` and `/search/multi` mix movies, TV shows and people, tagged by `media_type`. */
export type TmdbMultiResult =
  | (TmdbMovieResult & { media_type: "movie" })
  | (TmdbTvResult & { media_type: "tv" })
  | { id: number; media_type: "person" };
