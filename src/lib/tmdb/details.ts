import "server-only";
import { cache } from "react";
import {
  applyEpisodeOverrides,
  applyMovieOverrides,
  applyTvOverrides,
  getEpisodeRule,
  getShowRules,
  getTitleRule,
} from "@/lib/content/rules";
import { normalizeMovie, normalizeTvShow, parseYear } from "@/lib/tmdb/catalogue";
import { TmdbError, tmdbFetch } from "@/lib/tmdb/client";
import type {
  TmdbCredits,
  TmdbMovieDetails,
  TmdbSeasonDetails,
  TmdbSeasonSummary,
  TmdbTvDetails,
} from "@/lib/tmdb/types";
import type {
  CastMember,
  MovieDetails,
  SeasonDetails,
  SeasonSummary,
  TvShowDetails,
} from "@/types/media";

const LANGUAGE = "en-US";
const CERTIFICATION_COUNTRY = "US";
const CAST_LIMIT = 10;
const THEATRICAL_RELEASE = 3;

/** Resolves to `null` when TMDB has no such resource, so pages can render a 404. */
async function fetchOrNull<T>(path: string, params: Record<string, string>): Promise<T | null> {
  try {
    return await tmdbFetch<T>(path, params);
  } catch (error) {
    if (error instanceof TmdbError && error.status === 404) return null;
    throw error;
  }
}

function textOrNull(value: string | null | undefined): string | null {
  return value?.trim() || null;
}

function normalizeCast(credits: TmdbCredits): CastMember[] {
  return [...credits.cast]
    .sort((a, b) => a.order - b.order)
    .slice(0, CAST_LIMIT)
    .map((member) => ({
      id: member.id,
      name: member.name,
      character: member.character,
      profilePath: member.profile_path,
    }));
}

function movieCertification(movie: TmdbMovieDetails): string | null {
  const releases =
    movie.release_dates.results
      .find((result) => result.iso_3166_1 === CERTIFICATION_COUNTRY)
      ?.release_dates.filter((release) => release.certification) ?? [];
  const release = releases.find((r) => r.type === THEATRICAL_RELEASE) ?? releases[0];
  return release?.certification ?? null;
}

// US-10 View Content Details (movies), as TMDB has it
export const getTmdbMovieDetails = cache(async (id: number): Promise<MovieDetails | null> => {
  const movie = await fetchOrNull<TmdbMovieDetails>(`/movie/${id}`, {
    language: LANGUAGE,
    append_to_response: "credits,release_dates",
  });
  if (!movie) return null;

  return {
    ...normalizeMovie(movie),
    mediaType: "movie",
    backdropPath: movie.backdrop_path,
    tagline: textOrNull(movie.tagline),
    overview: textOrNull(movie.overview),
    genres: movie.genres.map((genre) => genre.name),
    certification: movieCertification(movie),
    tmdbVoteCount: movie.vote_count,
    status: textOrNull(movie.status),
    originalLanguage: textOrNull(movie.original_language),
    cast: normalizeCast(movie.credits),
    releaseDate: textOrNull(movie.release_date),
    runtime: movie.runtime || null,
    directors: [
      ...new Set(
        movie.credits.crew.filter((member) => member.job === "Director").map((m) => m.name),
      ),
    ],
  };
});

// US-11 View Show Seasons
function normalizeSeasons(seasons: TmdbSeasonSummary[]): SeasonSummary[] {
  const summaries = seasons
    .filter((season) => season.episode_count > 0)
    .map((season) => ({
      seasonNumber: season.season_number,
      name: season.name,
      year: parseYear(season.air_date),
      episodeCount: season.episode_count,
      posterPath: season.poster_path,
    }));
  return [
    ...summaries.filter((season) => season.seasonNumber > 0),
    ...summaries.filter((season) => season.seasonNumber === 0),
  ];
}

// US-10 View Content Details (TV shows), as TMDB has it
export const getTmdbTvShowDetails = cache(async (id: number): Promise<TvShowDetails | null> => {
  const show = await fetchOrNull<TmdbTvDetails>(`/tv/${id}`, {
    language: LANGUAGE,
    append_to_response: "credits,content_ratings",
  });
  if (!show) return null;

  return {
    ...normalizeTvShow(show),
    mediaType: "tv",
    backdropPath: show.backdrop_path,
    tagline: textOrNull(show.tagline),
    overview: textOrNull(show.overview),
    genres: show.genres.map((genre) => genre.name),
    certification: textOrNull(
      show.content_ratings.results.find((r) => r.iso_3166_1 === CERTIFICATION_COUNTRY)?.rating,
    ),
    tmdbVoteCount: show.vote_count,
    status: textOrNull(show.status),
    originalLanguage: textOrNull(show.original_language),
    cast: normalizeCast(show.credits),
    firstAirDate: textOrNull(show.first_air_date),
    lastAirDate: textOrNull(show.last_air_date),
    episodeRuntime: show.episode_run_time[0] ?? null,
    creators: show.created_by.map((creator) => creator.name),
    networks: show.networks.map((network) => network.name),
    seasonCount: show.number_of_seasons,
    episodeCount: show.number_of_episodes,
    seasons: normalizeSeasons(show.seasons),
  };
});

// US-12 View Season Episodes, as TMDB has it
export const getTmdbSeasonDetails = cache(
  async (showId: number, seasonNumber: number): Promise<SeasonDetails | null> => {
    const season = await fetchOrNull<TmdbSeasonDetails>(
      `/tv/${showId}/season/${seasonNumber}`,
      { language: LANGUAGE },
    );
    if (!season) return null;

    return {
      seasonNumber: season.season_number,
      name: season.name,
      overview: textOrNull(season.overview),
      year: parseYear(season.air_date),
      posterPath: season.poster_path,
      episodes: season.episodes.map((episode) => ({
        id: episode.id,
        episodeNumber: episode.episode_number,
        name: episode.name,
        overview: textOrNull(episode.overview),
        airDate: textOrNull(episode.air_date),
        runtime: episode.runtime || null,
        stillPath: episode.still_path,
      })),
    };
  },
);

// The versions Echo's public pages show: `null` (a 404) for anything an admin hid, with admin
// edits applied over TMDB's data (US-52 to US-57).

export const getMovieDetails = cache(async (id: number): Promise<MovieDetails | null> => {
  const [movie, rule] = await Promise.all([
    getTmdbMovieDetails(id),
    getTitleRule({ mediaType: "movie", tmdbId: id }),
  ]);
  if (!movie || rule?.hidden) return null;
  return rule ? applyMovieOverrides(movie, rule.overrides) : movie;
});

export const getTvShowDetails = cache(async (id: number): Promise<TvShowDetails | null> => {
  const [show, rule, showRules] = await Promise.all([
    getTmdbTvShowDetails(id),
    getTitleRule({ mediaType: "tv", tmdbId: id }),
    getShowRules(id),
  ]);
  if (!show || rule?.hidden) return null;

  const hiddenEpisodes = (seasonNumber: number) =>
    [...showRules.episodes].filter(
      ([key, episode]) => episode.hidden && key.startsWith(`${seasonNumber}-`),
    ).length;

  // Counts leave out hidden seasons and episodes; TMDB's show totals skip specials (season 0).
  const seasons: TvShowDetails["seasons"] = [];
  let hiddenSeasonCount = 0;
  let hiddenEpisodeCount = 0;
  for (const season of show.seasons) {
    const hidden = showRules.hiddenSeasons.has(season.seasonNumber);
    const episodeCount = hidden
      ? 0
      : Math.max(0, season.episodeCount - hiddenEpisodes(season.seasonNumber));
    if (season.seasonNumber > 0) {
      hiddenEpisodeCount += season.episodeCount - episodeCount;
      if (hidden) hiddenSeasonCount += 1;
    }
    if (!hidden) seasons.push({ ...season, episodeCount });
  }

  const visible: TvShowDetails = {
    ...show,
    seasons,
    seasonCount: Math.max(0, show.seasonCount - hiddenSeasonCount),
    episodeCount: Math.max(0, show.episodeCount - hiddenEpisodeCount),
  };
  return rule ? applyTvOverrides(visible, rule.overrides) : visible;
});

export const getSeasonDetails = cache(
  async (showId: number, seasonNumber: number): Promise<SeasonDetails | null> => {
    const [season, rule, showRules] = await Promise.all([
      getTmdbSeasonDetails(showId, seasonNumber),
      getTitleRule({ mediaType: "tv", tmdbId: showId }),
      getShowRules(showId),
    ]);
    if (!season || rule?.hidden || showRules.hiddenSeasons.has(seasonNumber)) return null;

    return {
      ...season,
      episodes: season.episodes.flatMap((episode) => {
        const episodeRule = getEpisodeRule(showRules, seasonNumber, episode.episodeNumber);
        if (!episodeRule) return [episode];
        return episodeRule.hidden ? [] : [applyEpisodeOverrides(episode, episodeRule.overrides)];
      }),
    };
  },
);
