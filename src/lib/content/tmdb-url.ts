/**
 * Reads which movie, show, season or episode a TMDB page link points to (US-50, US-51, US-54,
 * US-55). Only the identifiers are used; the link itself is never fetched.
 */

export type TmdbTarget =
  | { kind: "movie"; tmdbId: number }
  | { kind: "tv"; tmdbId: number }
  | { kind: "season"; tmdbId: number; seasonNumber: number }
  | { kind: "episode"; tmdbId: number; seasonNumber: number; episodeNumber: number };

export type TmdbUrlResult = { ok: true; target: TmdbTarget } | { ok: false; message: string };

const HOSTS = new Set(["themoviedb.org", "www.themoviedb.org"]);
const MAX_URL_LENGTH = 500;
/** An ID, optionally followed by TMDB's title slug, e.g. "1396-breaking-bad". */
const ID_SEGMENT = /^([1-9]\d{0,8})(?:-[^/]*)?$/;
const SEASON_NUMBER = /^(0|[1-9]\d{0,3})$/;
const EPISODE_NUMBER = /^[1-9]\d{0,4}$/;

const INVALID = "Paste a TMDB link to a movie, TV show, season or episode.";

export function parseTmdbUrl(input: string): TmdbUrlResult {
  const text = input.trim();
  if (!text) return { ok: false, message: INVALID };
  if (text.length > MAX_URL_LENGTH) return { ok: false, message: "That link is too long." };

  let url: URL;
  try {
    url = new URL(/^[a-z][a-z\d+.-]*:\/\//i.test(text) ? text : `https://${text}`);
  } catch {
    return { ok: false, message: INVALID };
  }
  if ((url.protocol !== "https:" && url.protocol !== "http:") || url.username || url.password || url.port) {
    return { ok: false, message: INVALID };
  }
  if (!HOSTS.has(url.hostname.toLowerCase())) {
    return { ok: false, message: "Only links from themoviedb.org are supported." };
  }

  const segments = url.pathname.split("/").filter(Boolean);
  const [type, idSegment, seasonWord, season, episodeWord, episode, ...rest] = segments;
  const tmdbId = Number(ID_SEGMENT.exec(idSegment ?? "")?.[1] ?? NaN);
  if (rest.length > 0 || !Number.isInteger(tmdbId)) return { ok: false, message: INVALID };

  if (type === "movie" && segments.length === 2) return { ok: true, target: { kind: "movie", tmdbId } };
  if (type !== "tv") return { ok: false, message: INVALID };
  if (segments.length === 2) return { ok: true, target: { kind: "tv", tmdbId } };

  if (seasonWord !== "season" || !SEASON_NUMBER.test(season ?? "")) {
    return { ok: false, message: "That season number isn't valid." };
  }
  const seasonNumber = Number(season);
  if (segments.length === 4) return { ok: true, target: { kind: "season", tmdbId, seasonNumber } };

  if (episodeWord !== "episode" || !EPISODE_NUMBER.test(episode ?? "")) {
    return { ok: false, message: "That episode number isn't valid." };
  }
  return { ok: true, target: { kind: "episode", tmdbId, seasonNumber, episodeNumber: Number(episode) } };
}
