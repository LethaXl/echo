// Episode ordering for the simulated viewer. Works on TMDB's own season and episode lists, so gaps
// in numbering and seasons of different lengths are handled as they come.

type EpisodeLike = { episodeNumber: number; airDate: string | null };
type SeasonLike = { seasonNumber: number; episodeCount: number };

/** Today as a calendar day ("2026-10-10"), the format TMDB uses for air dates. */
export function todayCalendarDate(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Episodes that haven't aired yet can't be watched. TMDB leaves some older air dates blank. */
export function isEpisodeAvailable(episode: EpisodeLike, today: string): boolean {
  return episode.airDate === null || episode.airDate <= today;
}

/** The first available episode numbered after `after` in this season, or `null`. */
export function nextEpisodeInSeason<T extends EpisodeLike>(
  episodes: T[],
  after: number,
  today: string,
): T | null {
  let next: T | null = null;
  for (const episode of episodes) {
    if (episode.episodeNumber <= after || !isEpisodeAvailable(episode, today)) continue;
    if (!next || episode.episodeNumber < next.episodeNumber) next = episode;
  }
  return next;
}

export function firstEpisodeInSeason<T extends EpisodeLike>(episodes: T[], today: string): T | null {
  return nextEpisodeInSeason(episodes, Number.NEGATIVE_INFINITY, today);
}

/**
 * Seasons to look in, in order, after `current` finishes. Specials (season 0) are skipped, and
 * someone watching a special stays within the specials.
 */
export function seasonsAfter(seasons: SeasonLike[], current: number): number[] {
  if (current === 0) return [];
  return seasons
    .filter((season) => season.seasonNumber > current && season.episodeCount > 0)
    .map((season) => season.seasonNumber)
    .sort((a, b) => a - b);
}

/** Where "Watch now" starts on a show: its numbered seasons in order, never the specials. */
export function numberedSeasons(seasons: SeasonLike[]): number[] {
  return seasonsAfter(seasons, Number.NEGATIVE_INFINITY).filter((number) => number > 0);
}
