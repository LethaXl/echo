"use server";

import type { PostgrestError } from "@supabase/supabase-js";
import { GENERIC_ERROR_MESSAGE, NOT_CONFIGURED_MESSAGE } from "@/lib/auth/errors";
import type { FormState } from "@/lib/auth/form-state";
import { getText } from "@/lib/auth/validation";
import { buildOverrides, EPISODE_FIELDS, TITLE_FIELDS, type OverrideField } from "@/lib/content/overrides";
import { parseTmdbUrl, type TmdbTarget } from "@/lib/content/tmdb-url";
import { formatSeasonLabel } from "@/lib/format";
import { parseRouteNumber } from "@/lib/media-routes";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import {
  getTmdbMovieDetails,
  getTmdbSeasonDetails,
  getTmdbTvShowDetails,
} from "@/lib/tmdb/details";
import type { Episode, MediaReference, MovieDetails, SeasonDetails, TvShowDetails } from "@/types/media";
import { isCurrentUserAdmin } from "./access";
import {
  episodeTmdbValues,
  getManagedTitle,
  getSeasonContents,
  titleTmdbValues,
  type SeasonContents,
} from "./content-queries";

/**
 * Admin writes for /admin/content (US-50 to US-57). Every write runs with the admin's own
 * session, so RLS and is_admin() in the database check access again. Public pages read admin
 * changes on every request, so nothing needs revalidating; the admin's page refreshes itself
 * once the result has been shown.
 */

/** A form result with the heading to show when it succeeds. */
export type ContentActionState = FormState & { title?: string };

const NOT_ALLOWED_MESSAGE = "You don't have permission to manage content.";
const TMDB_UNAVAILABLE_MESSAGE = "TMDB couldn't be reached, so nothing was saved. Please try again.";
const INVALID_MESSAGE = "Those details couldn't be saved. Check them and try again.";

type Supabase = Awaited<ReturnType<typeof createClient>>;
type ImportResult = { title_added: boolean; seasons_added: number; episodes_added: number };
type Failure = { ok: false; state: ContentActionState };

function errorState(message: string, field?: string): ContentActionState {
  return { status: "error", message, field };
}

function success(title: string, message: string): ContentActionState {
  return { status: "success", title, message };
}

const quoted = (name: string) => `“${name}”`;

/** The database checks admin access again (RLS and is_admin()), so this is for clear messages. */
async function adminCheck(): Promise<ContentActionState | null> {
  if (!isSupabaseConfigured()) return errorState(NOT_CONFIGURED_MESSAGE);
  if (!(await isCurrentUserAdmin())) return errorState(NOT_ALLOWED_MESSAGE);
  return null;
}

function writeError(error: PostgrestError, action: string): ContentActionState {
  if (error.code === "42501") return errorState(NOT_ALLOWED_MESSAGE);
  if (error.code === "23514" || error.code === "22023" || error.code === "22007") {
    return errorState(INVALID_MESSAGE);
  }
  console.error(`Failed to ${action}:`, error.code, error.message);
  return errorState(GENERIC_ERROR_MESSAGE);
}

function getNumber(formData: FormData, name: string): number | null {
  return parseRouteNumber(getText(formData, name));
}

function getReference(formData: FormData): MediaReference | null {
  const mediaType = getText(formData, "mediaType");
  const tmdbId = getNumber(formData, "tmdbId");
  if ((mediaType !== "movie" && mediaType !== "tv") || !tmdbId) return null;
  return { mediaType, tmdbId };
}

function getHidden(formData: FormData): boolean | null {
  const value = getText(formData, "hidden");
  return value === "true" ? true : value === "false" ? false : null;
}

/** Show, season and (optionally) episode numbers from a form. */
function getEpisodeReference(formData: FormData, withEpisode: boolean) {
  const showId = getNumber(formData, "tmdbId");
  const seasonNumber = getNumber(formData, "seasonNumber");
  const episodeNumber = withEpisode ? getNumber(formData, "episodeNumber") : 0;
  if (!showId || seasonNumber === null || episodeNumber === null) return null;
  return { showId, seasonNumber, episodeNumber };
}

function getFieldInputs(formData: FormData, fields: OverrideField[]): Record<string, string> {
  return Object.fromEntries(fields.map((field) => [field.key, String(formData.get(`field.${field.key}`) ?? "")]));
}

/** TMDB's current details, `null` when TMDB has no such title; throws when TMDB can't be reached. */
function loadTmdbTitle(ref: MediaReference): Promise<MovieDetails | TvShowDetails | null> {
  return ref.mediaType === "movie" ? getTmdbMovieDetails(ref.tmdbId) : getTmdbTvShowDetails(ref.tmdbId);
}

/** TMDB's title, year and poster, saved with the record for admin lists and search. */
function snapshot(details: { title: string; year: number | null; posterPath: string | null }) {
  return {
    p_tmdb_title: details.title.slice(0, 500),
    p_tmdb_year: details.year,
    p_tmdb_poster_path: details.posterPath,
  };
}

/**
 * Saves a title's record, creating it the first time a title is edited or hidden. TMDB's
 * snapshot is refreshed; titles TMDB no longer has keep the snapshot already saved.
 */
async function saveTitle(
  ref: MediaReference,
  changes: { p_overrides?: object; p_is_hidden?: boolean },
): Promise<{ ok: true; title: string } | Failure> {
  let details: MovieDetails | TvShowDetails | null;
  try {
    details = await loadTmdbTitle(ref);
  } catch {
    return { ok: false, state: errorState(TMDB_UNAVAILABLE_MESSAGE) };
  }

  let base = details && snapshot(details);
  if (!base) {
    const managed = await getManagedTitle(ref.mediaType, ref.tmdbId);
    if (!managed) return { ok: false, state: errorState("TMDB doesn't have this title.") };
    base = snapshot({ title: managed.tmdbTitle, year: managed.tmdbYear, posterPath: managed.tmdbPosterPath });
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_save_title", {
    p_media_type: ref.mediaType,
    p_tmdb_id: ref.tmdbId,
    ...base,
    ...changes,
  });
  if (error) return { ok: false, state: writeError(error, "save title") };
  return { ok: true, title: details?.title ?? base.p_tmdb_title };
}

const validDate = (date: string | null) => (date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : null);

function seasonPayload(seasonNumber: number, name: string | null, episodes: Episode[]) {
  return {
    season_number: seasonNumber,
    name: name?.slice(0, 500) ?? "",
    episodes: episodes.map((episode) => ({
      episode_number: episode.episodeNumber,
      tmdb_episode_id: episode.id > 0 ? episode.id : null,
      name: episode.name?.slice(0, 500) ?? "",
      air_date: validDate(episode.airDate),
    })),
  };
}

/** Saves a show's seasons and episodes in one transaction; anything already imported is kept as it is. */
async function importTvContent(
  show: TvShowDetails,
  seasons: ReturnType<typeof seasonPayload>[],
): Promise<{ ok: true; result: ImportResult } | Failure> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_import_tv_content", {
    p_tmdb_id: show.tmdbId,
    ...snapshot(show),
    p_seasons: seasons,
  });
  if (error) return { ok: false, state: writeError(error, "import TV content") };
  return { ok: true, result: data as ImportResult };
}

type SeasonRecord = { id: string; name: string; hidden: boolean; showHidden: boolean };
type SeasonRecordRow = {
  id: string;
  tmdb_name: string | null;
  is_hidden: boolean;
  managed_titles: { is_hidden: boolean };
};

/** `undefined` when it couldn't be read; `null` when the season isn't imported. */
async function findSeasonRecord(
  supabase: Supabase,
  showId: number,
  seasonNumber: number,
): Promise<SeasonRecord | null | undefined> {
  const { data, error } = await supabase
    .from("managed_seasons")
    .select("id, tmdb_name, is_hidden, managed_titles!inner(tmdb_id, media_type, is_hidden)")
    .eq("managed_titles.media_type", "tv")
    .eq("managed_titles.tmdb_id", showId)
    .eq("season_number", seasonNumber)
    .maybeSingle<SeasonRecordRow>();
  if (error) {
    console.error("Failed to find season:", error.code, error.message);
    return undefined;
  }
  if (!data) return null;
  return {
    id: data.id,
    name: data.tmdb_name ?? formatSeasonLabel(seasonNumber),
    hidden: data.is_hidden,
    showHidden: data.managed_titles.is_hidden,
  };
}

/**
 * The season's record, created (with the show's, and no episodes) when it isn't imported yet,
 * so a season can be hidden without importing it.
 */
async function ensureSeasonRecord(
  supabase: Supabase,
  showId: number,
  seasonNumber: number,
): Promise<{ ok: true; season: SeasonRecord } | Failure> {
  const existing = await findSeasonRecord(supabase, showId, seasonNumber);
  if (existing === undefined) return { ok: false, state: errorState(GENERIC_ERROR_MESSAGE) };
  if (existing) return { ok: true, season: existing };

  let show: TvShowDetails | null;
  try {
    show = await getTmdbTvShowDetails(showId);
  } catch {
    return { ok: false, state: errorState(TMDB_UNAVAILABLE_MESSAGE) };
  }
  const summary = show?.seasons.find((season) => season.seasonNumber === seasonNumber);
  if (!show || !summary) return { ok: false, state: errorState("TMDB doesn't have this season.") };

  const imported = await importTvContent(show, [seasonPayload(seasonNumber, summary.name, [])]);
  if (!imported.ok) return imported;
  const created = await findSeasonRecord(supabase, showId, seasonNumber);
  if (!created) return { ok: false, state: errorState(GENERIC_ERROR_MESSAGE) };
  return { ok: true, season: created };
}

type EpisodeRecord = {
  id: string;
  name: string | null;
  airDate: string | null;
  hidden: boolean;
  season: SeasonRecord;
};

/** `undefined` when it couldn't be read; `null` when the episode isn't imported. */
async function findEpisodeRecord(
  supabase: Supabase,
  showId: number,
  seasonNumber: number,
  episodeNumber: number,
): Promise<EpisodeRecord | null | undefined> {
  const season = await findSeasonRecord(supabase, showId, seasonNumber);
  if (!season) return season;
  const { data, error } = await supabase
    .from("managed_episodes")
    .select("id, tmdb_name, tmdb_air_date, is_hidden")
    .eq("season_id", season.id)
    .eq("episode_number", episodeNumber)
    .maybeSingle<{ id: string; tmdb_name: string | null; tmdb_air_date: string | null; is_hidden: boolean }>();
  if (error) {
    console.error("Failed to find episode:", error.code, error.message);
    return undefined;
  }
  if (!data) return null;
  return { id: data.id, name: data.tmdb_name, airDate: data.tmdb_air_date, hidden: data.is_hidden, season };
}

/**
 * The episode's record, created (with its show's and season's) when it isn't imported yet, so
 * one episode can be hidden or edited without importing its whole season.
 */
async function ensureEpisodeRecord(
  supabase: Supabase,
  showId: number,
  seasonNumber: number,
  episodeNumber: number,
): Promise<{ ok: true; episode: EpisodeRecord } | Failure> {
  const existing = await findEpisodeRecord(supabase, showId, seasonNumber, episodeNumber);
  if (existing === undefined) return { ok: false, state: errorState(GENERIC_ERROR_MESSAGE) };
  if (existing) return { ok: true, episode: existing };

  let show: TvShowDetails | null;
  let season: SeasonDetails | null;
  try {
    [show, season] = await Promise.all([getTmdbTvShowDetails(showId), getTmdbSeasonDetails(showId, seasonNumber)]);
  } catch {
    return { ok: false, state: errorState(TMDB_UNAVAILABLE_MESSAGE) };
  }
  const episode = season?.episodes.find((item) => item.episodeNumber === episodeNumber);
  if (!show || !season || !episode) return { ok: false, state: errorState("TMDB doesn't have this episode.") };

  const imported = await importTvContent(show, [seasonPayload(seasonNumber, season.name, [episode])]);
  if (!imported.ok) return imported;
  const created = await findEpisodeRecord(supabase, showId, seasonNumber, episodeNumber);
  if (!created) return { ok: false, state: errorState(GENERIC_ERROR_MESSAGE) };
  return { ok: true, episode: created };
}

const episodeLabel = (episodeNumber: number, name: string | null) =>
  name?.trim() ? `${quoted(name.trim())} (episode ${episodeNumber})` : `Episode ${episodeNumber}`;

// US-52 Edit Content Details
export async function saveTitleDetails(
  _previousState: ContentActionState,
  formData: FormData,
): Promise<ContentActionState> {
  const denied = await adminCheck();
  if (denied) return denied;
  const ref = getReference(formData);
  if (!ref) return errorState("Choose a movie or TV show.");

  let details: MovieDetails | TvShowDetails | null;
  try {
    details = await loadTmdbTitle(ref);
  } catch {
    return errorState(TMDB_UNAVAILABLE_MESSAGE);
  }
  if (!details) return errorState("TMDB doesn't have this title, so it can't be edited.");

  // Compared with TMDB's values on the server, so only real changes are stored.
  const built = buildOverrides(TITLE_FIELDS, titleTmdbValues(details), getFieldInputs(formData, TITLE_FIELDS));
  if (!built.ok) return errorState(built.message, built.field);

  const saved = await saveTitle(ref, { p_overrides: built.overrides });
  if (!saved.ok) return saved.state;
  const shown = typeof built.overrides.title === "string" ? built.overrides.title : details.title;
  return Object.keys(built.overrides).length > 0
    ? success("Changes saved", `${shown} now shows your changes everywhere on Echo.`)
    : success("Changes saved", `${shown} now uses TMDB's details for every field.`);
}

// US-53 Remove Catalogue Content (hide and restore)
export async function setTitleHidden(
  _previousState: ContentActionState,
  formData: FormData,
): Promise<ContentActionState> {
  const denied = await adminCheck();
  if (denied) return denied;
  const ref = getReference(formData);
  const hidden = getHidden(formData);
  if (!ref || hidden === null) return errorState(GENERIC_ERROR_MESSAGE);

  const saved = await saveTitle(ref, { p_is_hidden: hidden });
  if (!saved.ok) return saved.state;
  return hidden
    ? success("Hidden", `${saved.title} is now hidden from Echo.`)
    : success("Restored", `${saved.title} is now available on Echo.`);
}

// US-57 Remove an Episode, and hiding whole seasons
export async function setSeasonHidden(
  _previousState: ContentActionState,
  formData: FormData,
): Promise<ContentActionState> {
  const denied = await adminCheck();
  if (denied) return denied;
  const ref = getEpisodeReference(formData, false);
  const hidden = getHidden(formData);
  if (!ref || hidden === null) return errorState(GENERIC_ERROR_MESSAGE);

  const supabase = await createClient();
  const ensured = await ensureSeasonRecord(supabase, ref.showId, ref.seasonNumber);
  if (!ensured.ok) return ensured.state;
  const { season } = ensured;

  const { data, error } = await supabase
    .from("managed_seasons")
    .update({ is_hidden: hidden })
    .eq("id", season.id)
    .select("id")
    .maybeSingle();
  if (error) return writeError(error, "change season visibility");
  if (!data) return errorState(NOT_ALLOWED_MESSAGE);

  if (hidden) return success("Hidden", `${season.name} is now hidden from Echo.`);
  return season.showHidden
    ? success("Restored", `${season.name} is restored. It stays unavailable while the show is hidden.`)
    : success("Restored", `${season.name} is now available on Echo.`);
}

export async function setEpisodeHidden(
  _previousState: ContentActionState,
  formData: FormData,
): Promise<ContentActionState> {
  const denied = await adminCheck();
  if (denied) return denied;
  const ref = getEpisodeReference(formData, true);
  const hidden = getHidden(formData);
  if (!ref || hidden === null) return errorState(GENERIC_ERROR_MESSAGE);

  const supabase = await createClient();
  const ensured = await ensureEpisodeRecord(supabase, ref.showId, ref.seasonNumber, ref.episodeNumber);
  if (!ensured.ok) return ensured.state;
  const { episode } = ensured;

  const { data, error } = await supabase
    .from("managed_episodes")
    .update({ is_hidden: hidden })
    .eq("id", episode.id)
    .select("id")
    .maybeSingle();
  if (error) return writeError(error, "change episode visibility");
  if (!data) return errorState(NOT_ALLOWED_MESSAGE);

  const label = episodeLabel(ref.episodeNumber, episode.name);
  if (hidden) return success("Hidden", `${label} is now hidden from Echo.`);
  if (episode.season.showHidden) {
    return success("Restored", `${label} is restored. It stays unavailable while the show is hidden.`);
  }
  if (episode.season.hidden) {
    return success("Restored", `${label} is restored. It stays unavailable while ${episode.season.name} is hidden.`);
  }
  return success("Restored", `${label} is now available on Echo.`);
}

// US-56 Edit Episode Details
export async function saveEpisodeDetails(
  _previousState: ContentActionState,
  formData: FormData,
): Promise<ContentActionState> {
  const denied = await adminCheck();
  if (denied) return denied;
  const ref = getEpisodeReference(formData, true);
  if (!ref) return errorState(GENERIC_ERROR_MESSAGE);

  const supabase = await createClient();
  let season: SeasonDetails | null;
  try {
    season = await getTmdbSeasonDetails(ref.showId, ref.seasonNumber);
  } catch {
    return errorState(TMDB_UNAVAILABLE_MESSAGE);
  }
  const tmdbEpisode = season?.episodes.find((item) => item.episodeNumber === ref.episodeNumber);
  const inputs = getFieldInputs(formData, EPISODE_FIELDS);

  if (tmdbEpisode) {
    const built = buildOverrides(EPISODE_FIELDS, episodeTmdbValues(tmdbEpisode), inputs);
    if (!built.ok) return errorState(built.message, built.field);
    const ensured = await ensureEpisodeRecord(supabase, ref.showId, ref.seasonNumber, ref.episodeNumber);
    if (!ensured.ok) return ensured.state;
    return writeEpisodeOverrides(supabase, ensured.episode.id, built.overrides, tmdbEpisode.name);
  }

  // Episodes TMDB no longer lists are compared with what was saved when they were imported.
  const existing = await findEpisodeRecord(supabase, ref.showId, ref.seasonNumber, ref.episodeNumber);
  if (existing === undefined) return errorState(GENERIC_ERROR_MESSAGE);
  if (existing === null) return errorState("TMDB doesn't have this episode.");
  const snapshotValues = { name: existing.name ?? "", overview: null, airDate: existing.airDate, stillPath: null };
  const built = buildOverrides(EPISODE_FIELDS, snapshotValues, inputs);
  if (!built.ok) return errorState(built.message, built.field);
  return writeEpisodeOverrides(supabase, existing.id, built.overrides, existing.name);
}

async function writeEpisodeOverrides(
  supabase: Supabase,
  episodeId: string,
  overrides: Record<string, unknown>,
  tmdbName: string | null,
): Promise<ContentActionState> {
  const { data, error } = await supabase
    .from("managed_episodes")
    .update({ overrides })
    .eq("id", episodeId)
    .select("id")
    .maybeSingle();
  if (error) return writeError(error, "save episode");
  if (!data) return errorState(NOT_ALLOWED_MESSAGE);
  const name = typeof overrides.name === "string" ? overrides.name : (tmdbName ?? "");
  const shown = name.trim() ? quoted(name.trim()) : "This episode";
  return Object.keys(overrides).length > 0
    ? success("Changes saved", `${shown} now shows your changes on Echo.`)
    : success("Changes saved", `${shown} now uses TMDB's details for every field.`);
}

// ---------------------------------------------------------------------------------------------
// Add Content from a TMDB link: US-50 Add a Movie, US-51 Add a TV Show, US-54 Add a Show Season,
// US-55 Add an Episode. Everything on TMDB is already on Echo; adding saves Echo's record for it.
// ---------------------------------------------------------------------------------------------

/** Seasons fetched from TMDB at once while adding a show. */
const SEASON_BATCH_SIZE = 4;

/** Fetches seasons from TMDB a few at a time. Seasons TMDB no longer has are counted as missing. */
async function fetchSeasons(showId: number, seasonNumbers: number[]) {
  const seasons: SeasonDetails[] = [];
  let missing = 0;
  for (let start = 0; start < seasonNumbers.length; start += SEASON_BATCH_SIZE) {
    const batch = await Promise.all(
      seasonNumbers.slice(start, start + SEASON_BATCH_SIZE).map((number) => getTmdbSeasonDetails(showId, number)),
    );
    for (const season of batch) {
      if (season) seasons.push(season);
      else missing += 1;
    }
  }
  return { seasons, missing };
}

const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? "" : "s"}`;

export type AddContentPreview = {
  kind: TmdbTarget["kind"];
  kindLabel: string;
  title: string;
  details: string;
  imagePath: string | null;
  /** Episode stills are landscape; everything else uses a poster. */
  wideImage: boolean;
  alreadyAdded: boolean;
  manageHref: string;
};

type LoadedContent =
  | { kind: "movie"; movie: MovieDetails }
  | { kind: "tv"; show: TvShowDetails }
  | { kind: "season"; show: TvShowDetails; season: SeasonDetails }
  | { kind: "episode"; show: TvShowDetails; season: SeasonDetails; episode: Episode };

type Loaded = { ok: true; target: TmdbTarget; content: LoadedContent } | { ok: false; message: string };

/** TMDB's details for a link's target; never fetches the link itself. */
async function loadTarget(url: string): Promise<Loaded> {
  const parsed = parseTmdbUrl(url);
  if (!parsed.ok) return parsed;
  const { target } = parsed;
  try {
    if (target.kind === "movie") {
      const movie = await getTmdbMovieDetails(target.tmdbId);
      if (!movie) return { ok: false, message: "TMDB doesn't have this movie." };
      return { ok: true, target, content: { kind: "movie", movie } };
    }
    const [show, season] = await Promise.all([
      getTmdbTvShowDetails(target.tmdbId),
      target.kind === "tv" ? null : getTmdbSeasonDetails(target.tmdbId, target.seasonNumber),
    ]);
    if (!show) return { ok: false, message: "TMDB doesn't have this show." };
    if (target.kind === "tv") return { ok: true, target, content: { kind: "tv", show } };
    if (!season) return { ok: false, message: "TMDB doesn't have this season." };
    if (target.kind === "season") return { ok: true, target, content: { kind: "season", show, season } };
    const episode = season.episodes.find((item) => item.episodeNumber === target.episodeNumber);
    if (!episode) return { ok: false, message: "TMDB doesn't have this episode." };
    return { ok: true, target, content: { kind: "episode", show, season, episode } };
  } catch {
    return { ok: false, message: "TMDB couldn't be reached. Try again in a moment." };
  }
}

function describe(content: LoadedContent): Omit<AddContentPreview, "kind" | "alreadyAdded" | "manageHref"> {
  switch (content.kind) {
    case "movie":
      return {
        kindLabel: "Movie",
        title: content.movie.title,
        details: content.movie.year ? String(content.movie.year) : "Movie",
        imagePath: content.movie.posterPath,
        wideImage: false,
      };
    case "tv":
      return {
        kindLabel: "TV Show",
        title: content.show.title,
        details: [content.show.year, plural(content.show.seasonCount, "season")].filter(Boolean).join(" · "),
        imagePath: content.show.posterPath,
        wideImage: false,
      };
    case "season":
      return {
        kindLabel: "Season",
        title: content.season.name,
        details: `${content.show.title} · ${plural(content.season.episodes.length, "episode")}`,
        imagePath: content.season.posterPath ?? content.show.posterPath,
        wideImage: false,
      };
    case "episode":
      return {
        kindLabel: "Episode",
        title: content.episode.name || `Episode ${content.episode.episodeNumber}`,
        details: `${content.show.title} · ${content.season.name} · Episode ${content.episode.episodeNumber}`,
        imagePath: content.episode.stillPath ?? content.season.posterPath ?? content.show.posterPath,
        wideImage: Boolean(content.episode.stillPath),
      };
  }
}

/** Whether Echo already has a record for the target; `undefined` if that couldn't be checked. */
async function isAdded(supabase: Supabase, target: TmdbTarget): Promise<boolean | undefined> {
  if (target.kind === "movie" || target.kind === "tv") {
    const managed = await getManagedTitle(target.kind, target.tmdbId);
    return managed === undefined ? undefined : managed !== null;
  }
  const record =
    target.kind === "season"
      ? await findSeasonRecord(supabase, target.tmdbId, target.seasonNumber)
      : await findEpisodeRecord(supabase, target.tmdbId, target.seasonNumber, target.episodeNumber);
  return record === undefined ? undefined : record !== null;
}

export async function previewTmdbContent(
  url: string,
): Promise<{ ok: true; preview: AddContentPreview } | { ok: false; message: string }> {
  const denied = await adminCheck();
  if (denied) return { ok: false, message: denied.message ?? NOT_ALLOWED_MESSAGE };
  if (typeof url !== "string") return { ok: false, message: GENERIC_ERROR_MESSAGE };

  const loaded = await loadTarget(url);
  if (!loaded.ok) return loaded;
  const added = await isAdded(await createClient(), loaded.target);
  if (added === undefined) return { ok: false, message: GENERIC_ERROR_MESSAGE };

  const { target, content } = loaded;
  return {
    ok: true,
    preview: {
      ...describe(content),
      kind: target.kind,
      alreadyAdded: added,
      manageHref: `/admin/content/${target.kind === "movie" ? "movie" : "tv"}/${target.tmdbId}`,
    },
  };
}

export async function addTmdbContent(
  _previousState: ContentActionState,
  formData: FormData,
): Promise<ContentActionState> {
  const denied = await adminCheck();
  if (denied) return denied;
  const loaded = await loadTarget(getText(formData, "url"));
  if (!loaded.ok) return errorState(loaded.message);

  const supabase = await createClient();
  const { target, content } = loaded;
  const added = await isAdded(supabase, target);
  if (added === undefined) return errorState(GENERIC_ERROR_MESSAGE);
  if (added) return success("Already added", `${describe(content).title} has already been added, so nothing changed.`);

  if (content.kind === "movie") {
    const saved = await saveTitle({ mediaType: "movie", tmdbId: target.tmdbId }, {});
    if (!saved.ok) return saved.state;
    return success("Added", `${content.movie.title} has been added.`);
  }

  const { show } = content;
  if (content.kind === "tv") {
    let fetched: Awaited<ReturnType<typeof fetchSeasons>>;
    try {
      fetched = await fetchSeasons(show.tmdbId, show.seasons.map((season) => season.seasonNumber));
    } catch {
      return errorState(TMDB_UNAVAILABLE_MESSAGE);
    }
    const imported = await importTvContent(
      show,
      fetched.seasons.map((season) => seasonPayload(season.seasonNumber, season.name, season.episodes)),
    );
    if (!imported.ok) return imported.state;
    const { seasons_added, episodes_added } = imported.result;
    const missing = fetched.missing > 0 ? ` TMDB didn't return ${plural(fetched.missing, "season")}.` : "";
    return success(
      "Added",
      `${show.title} has been added with ${plural(seasons_added, "season")} and ${plural(episodes_added, "episode")}.${missing}`,
    );
  }

  const { season } = content;
  const episodes = content.kind === "episode" ? [content.episode] : season.episodes;
  const imported = await importTvContent(show, [seasonPayload(season.seasonNumber, season.name, episodes)]);
  if (!imported.ok) return imported.state;
  if (content.kind === "episode") {
    const label = episodeLabel(content.episode.episodeNumber, content.episode.name);
    return success("Added", `${label} of ${show.title} has been added.`);
  }
  return success(
    "Added",
    `${show.title} · ${season.name} has been added with ${plural(imported.result.episodes_added, "episode")}.`,
  );
}

/** A season's summary and episodes for the season manager, loaded when it's expanded or after a change. */
export async function loadSeason(showId: number, seasonNumber: number): Promise<SeasonContents> {
  if (!isSupabaseConfigured() || !(await isCurrentUserAdmin())) return { ok: false, message: NOT_ALLOWED_MESSAGE };
  const show = parseRouteNumber(String(showId));
  const season = Number.isInteger(seasonNumber) && seasonNumber >= 0 && seasonNumber < 10_000 ? seasonNumber : null;
  if (!show || season === null) return { ok: false, message: GENERIC_ERROR_MESSAGE };
  return getSeasonContents(show, season);
}
