import "server-only";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { seasonHref, titleHref, watchEpisodeHref } from "@/lib/media-routes";
import { getSeasonDetails } from "@/lib/tmdb/details";
import {
  firstEpisodeInSeason,
  isEpisodeAvailable,
  nextEpisodeInSeason,
  numberedSeasons,
  seasonsAfter,
  todayCalendarDate,
} from "@/lib/viewer/episodes";
import type { ViewerContent } from "@/lib/viewer/types";
import type { Episode, MovieDetails, TvShowDetails } from "@/types/media";

/** Used when TMDB has no runtime, so every title still has a timeline. */
const FALLBACK_RUNTIME_MINUTES = { movie: 120, episode: 45 };

const FINISHED_STATUSES = new Set(["Ended", "Canceled"]);

/** Viewer pages need a signed-in user; visitors log in and come straight back. */
export async function requireSignedIn(path: string): Promise<void> {
  if (!(await getCurrentUser())) redirect(`/login?next=${encodeURIComponent(path)}`);
}

function runtime(minutes: number | null | undefined, fallback: number) {
  const valid = minutes && minutes > 0 ? minutes : null;
  return { runtimeSeconds: (valid ?? fallback) * 60, runtimeEstimated: valid === null };
}

export function movieViewerContent(movie: MovieDetails): ViewerContent {
  return {
    key: `movie-${movie.tmdbId}`,
    title: movie.title,
    episode: null,
    backdrop: { path: movie.backdropPath ?? movie.posterPath, size: "w1280" },
    ...runtime(movie.runtime, FALLBACK_RUNTIME_MINUTES.movie),
    detailsHref: titleHref(movie),
    detailsLabel: `Back to ${movie.title}`,
    upNext: null,
    endMessage: null,
  };
}

type FoundEpisode = { seasonNumber: number; episode: Episode };

/** The first available episode in the first of these seasons that has one. */
async function firstEpisodeIn(
  showId: number,
  seasonNumbers: number[],
  today: string,
): Promise<FoundEpisode | null> {
  for (const seasonNumber of seasonNumbers) {
    const season = await getSeasonDetails(showId, seasonNumber);
    const episode = season && firstEpisodeInSeason(season.episodes, today);
    if (episode) return { seasonNumber, episode };
  }
  return null;
}

/** Where "Watch now" on a show starts: its first available episode, skipping specials. */
export async function getFirstEpisode(show: TvShowDetails): Promise<FoundEpisode | null> {
  return firstEpisodeIn(show.tmdbId, numberedSeasons(show.seasons), todayCalendarDate());
}

export type EpisodeViewerResult =
  | { status: "ok"; content: ViewerContent }
  | { status: "missing"; detailsHref: string }
  | { status: "unaired"; detailsHref: string; airDate: string };

export async function getEpisodeViewer(
  show: TvShowDetails,
  seasonNumber: number,
  episodeNumber: number,
): Promise<EpisodeViewerResult> {
  const today = todayCalendarDate();
  const season = await getSeasonDetails(show.tmdbId, seasonNumber);
  const episode = season?.episodes.find((item) => item.episodeNumber === episodeNumber);
  const detailsHref = season ? seasonHref(show.tmdbId, seasonNumber) : titleHref(show);

  if (!season || !episode) return { status: "missing", detailsHref };
  if (!isEpisodeAvailable(episode, today) && episode.airDate) {
    return { status: "unaired", detailsHref, airDate: episode.airDate };
  }

  const nextInSeason = nextEpisodeInSeason(season.episodes, episodeNumber, today);
  const next: FoundEpisode | null = nextInSeason
    ? { seasonNumber, episode: nextInSeason }
    : await firstEpisodeIn(show.tmdbId, seasonsAfter(show.seasons, seasonNumber), today);

  const finished = show.status !== null && FINISHED_STATUSES.has(show.status);

  return {
    status: "ok",
    content: {
      key: `tv-${show.tmdbId}-${seasonNumber}-${episodeNumber}`,
      title: show.title,
      episode: { seasonNumber, episodeNumber, name: episode.name },
      backdrop: episode.stillPath
        ? { path: episode.stillPath, size: "original" }
        : { path: show.backdropPath, size: "w1280" },
      ...runtime(episode.runtime ?? show.episodeRuntime, FALLBACK_RUNTIME_MINUTES.episode),
      detailsHref,
      detailsLabel: `Back to ${show.title}`,
      upNext: next && {
        href: `${watchEpisodeHref(show.tmdbId, next.seasonNumber, next.episode.episodeNumber)}?autoplay=1`,
        seasonNumber: next.seasonNumber,
        episodeNumber: next.episode.episodeNumber,
        name: next.episode.name,
        stillPath: next.episode.stillPath,
        runtimeMinutes: next.episode.runtime,
      },
      endMessage: next
        ? null
        : seasonNumber === 0
          ? "That's the last special."
          : finished
            ? `You've reached the end of ${show.title}.`
            : "You're all caught up. New episodes will appear here once they air.",
    },
  };
}
