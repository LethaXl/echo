import "server-only";
import type { EditField } from "@/components/admin/content/EditContentButton";
import {
  EPISODE_FIELDS,
  readOverrides,
  toInput,
  type OverrideField,
  type OverrideValue,
  type Overrides,
} from "@/lib/content/overrides";
import { applyCatalogueOverrides } from "@/lib/content/rules";
import { formatSeasonLabel } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { searchTmdbTitles } from "@/lib/tmdb/catalogue";
import { getTmdbSeasonDetails } from "@/lib/tmdb/details";
import type {
  CatalogueItem,
  Episode,
  MediaType,
  MovieDetails,
  SeasonDetails,
  TvShowDetails,
} from "@/types/media";

/**
 * Reads for /admin/content (US-50 to US-57). Every query runs with the admin's own session, and
 * RLS only lets admins read the managed_* tables. Pages call requireAdmin() first.
 */

/** Managed: has a management record. Hidden: managed and hidden. Not managed: TMDB only. */
export type ContentStatus = "managed" | "hidden" | "unmanaged";

export type AdminTitle = CatalogueItem & { status: ContentStatus };

export type ManagedTitle = {
  id: string;
  mediaType: MediaType;
  tmdbId: number;
  tmdbTitle: string;
  tmdbYear: number | null;
  tmdbPosterPath: string | null;
  overrides: Overrides;
  hidden: boolean;
};

export type ManagedEpisode = {
  id: string;
  episodeNumber: number;
  tmdbName: string | null;
  tmdbAirDate: string | null;
  overrides: Overrides;
  hidden: boolean;
};

export type ManagedSeason = {
  id: string;
  seasonNumber: number;
  tmdbName: string | null;
  hidden: boolean;
  episodes: ManagedEpisode[];
};

type TitleRow = {
  id: string;
  media_type: MediaType;
  tmdb_id: number;
  tmdb_title: string;
  tmdb_year: number | null;
  tmdb_poster_path: string | null;
  overrides: unknown;
  is_hidden: boolean;
};

type SeasonRow = {
  id: string;
  season_number: number;
  tmdb_name: string | null;
  is_hidden: boolean;
  managed_episodes: {
    id: string;
    episode_number: number;
    tmdb_name: string | null;
    tmdb_air_date: string | null;
    overrides: unknown;
    is_hidden: boolean;
  }[];
};

const TITLE_COLUMNS =
  "id, media_type, tmdb_id, tmdb_title, tmdb_year, tmdb_poster_path, overrides, is_hidden";

export const CONTENT_PAGE_SIZE = 20;
const SEARCH_LIMIT = 20;

function toManagedTitle(row: TitleRow): ManagedTitle {
  return {
    id: row.id,
    mediaType: row.media_type,
    tmdbId: row.tmdb_id,
    tmdbTitle: row.tmdb_title,
    tmdbYear: row.tmdb_year,
    tmdbPosterPath: row.tmdb_poster_path,
    overrides: readOverrides(row.overrides),
    hidden: row.is_hidden,
  };
}

/** How a managed title appears in admin lists: its saved TMDB values with admin edits applied. */
function toAdminTitle(row: TitleRow): AdminTitle {
  const title = toManagedTitle(row);
  const item: CatalogueItem = {
    mediaType: title.mediaType,
    tmdbId: title.tmdbId,
    title: title.tmdbTitle,
    year: title.tmdbYear,
    posterPath: title.tmdbPosterPath,
    tmdbRating: null,
  };
  return { ...applyCatalogueOverrides(item, title.overrides), status: title.hidden ? "hidden" : "managed" };
}

/** Titles Echo has a record for (edited, hidden, or with changed seasons or episodes), most recently updated first. */
export async function listManagedTitles(page: number): Promise<{ titles: AdminTitle[]; hasMore: boolean } | null> {
  const supabase = await createClient();
  const from = (page - 1) * CONTENT_PAGE_SIZE;
  // One extra row tells whether there's another page.
  const { data, error } = await supabase
    .from("managed_titles")
    .select(TITLE_COLUMNS)
    .order("updated_at", { ascending: false })
    .order("id")
    .range(from, from + CONTENT_PAGE_SIZE);
  if (error) {
    console.error("Failed to load managed content:", error.code, error.message);
    return null;
  }
  const rows = (data ?? []) as TitleRow[];
  return { titles: rows.slice(0, CONTENT_PAGE_SIZE).map(toAdminTitle), hasMore: rows.length > CONTENT_PAGE_SIZE };
}

const likePattern = (query: string) => `%${query.replace(/[\\%_]/g, (match) => `\\${match}`)}%`;

const titleKey = (title: { mediaType: string; tmdbId: number }) => `${title.mediaType}-${title.tmdbId}`;
const rowKey = (row: TitleRow) => titleKey({ mediaType: row.media_type, tmdbId: row.tmdb_id });

/**
 * One search over TMDB's movies and shows and Echo's records: TMDB matches with Echo's edits and
 * hidden state applied, then saved titles that only match by their edited or saved title. One row
 * per media type and TMDB ID.
 */
export async function searchContent(query: string): Promise<AdminTitle[] | null> {
  const supabase = await createClient();
  const pattern = likePattern(query);
  const managedQuery = () => supabase.from("managed_titles").select(TITLE_COLUMNS);

  const [tmdb, byTitle, byEdit] = await Promise.all([
    searchTmdbTitles(query),
    managedQuery().ilike("tmdb_title", pattern).limit(SEARCH_LIMIT),
    managedQuery().ilike("overrides->>title", pattern).limit(SEARCH_LIMIT),
  ]);
  const ids = [...new Set((tmdb ?? []).map((item) => item.tmdbId))];
  const known = ids.length > 0 ? await managedQuery().in("tmdb_id", ids) : { data: [], error: null };

  const error = byTitle.error ?? byEdit.error ?? known.error;
  if (error) console.error("Failed to search managed content:", error.code, error.message);
  if (!tmdb && error) return null;

  const managed = new Map<string, TitleRow>();
  for (const row of [...(known.data ?? []), ...(byTitle.data ?? []), ...(byEdit.data ?? [])] as TitleRow[]) {
    managed.set(rowKey(row), row);
  }

  const results: AdminTitle[] = [];
  const listed = new Set<string>();
  for (const item of tmdb ?? []) {
    const key = titleKey(item);
    if (listed.has(key)) continue;
    listed.add(key);
    const row = managed.get(key);
    results.push(row ? { ...toAdminTitle(row), tmdbRating: item.tmdbRating } : { ...item, status: "unmanaged" });
  }
  for (const [key, row] of managed) if (!listed.has(key)) results.push(toAdminTitle(row));
  return results;
}

/** `undefined` when it couldn't be loaded; `null` when the title isn't managed. */
export async function getManagedTitle(
  mediaType: MediaType,
  tmdbId: number,
): Promise<ManagedTitle | null | undefined> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("managed_titles")
    .select(TITLE_COLUMNS)
    .eq("media_type", mediaType)
    .eq("tmdb_id", tmdbId)
    .maybeSingle<TitleRow>();
  if (error) {
    console.error("Failed to load managed title:", error.code, error.message);
    return undefined;
  }
  return data ? toManagedTitle(data) : null;
}

function toManagedSeason(row: SeasonRow): ManagedSeason {
  return {
    id: row.id,
    seasonNumber: row.season_number,
    tmdbName: row.tmdb_name,
    hidden: row.is_hidden,
    episodes: row.managed_episodes
      .map((episode) => ({
        id: episode.id,
        episodeNumber: episode.episode_number,
        tmdbName: episode.tmdb_name,
        tmdbAirDate: episode.tmdb_air_date,
        overrides: readOverrides(episode.overrides),
        hidden: episode.is_hidden,
      }))
      .sort((a, b) => a.episodeNumber - b.episodeNumber),
  };
}

/** A season as the season manager lists it. */
export type SeasonItem = {
  seasonNumber: number;
  name: string;
  /** Episodes on TMDB, or the imported ones when TMDB no longer lists the season. */
  episodeCount: number;
  onTmdb: boolean;
  /** Hidden on its own (the show may also be hidden). */
  hidden: boolean;
  hiddenEpisodes: number;
};

/** An episode as the season manager lists it, with admin edits applied. */
export type EpisodeItem = {
  episodeNumber: number;
  name: string;
  airDate: string | null;
  onTmdb: boolean;
  hidden: boolean;
  edited: boolean;
  /** `null` when there's nothing to edit against: no record and not on TMDB. */
  fields: EditField[] | null;
};

type SeasonSummaryRow = {
  season_number: number;
  tmdb_name: string | null;
  is_hidden: boolean;
  managed_episodes: { is_hidden: boolean }[];
};

/** Every season of a show: TMDB's, then any imported season TMDB no longer lists. `null` if Echo's records couldn't be read. */
export async function getSeasonItems(show: TvShowDetails, titleId: string | null): Promise<SeasonItem[] | null> {
  let rows: SeasonSummaryRow[] = [];
  if (titleId) {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("managed_seasons")
      .select("season_number, tmdb_name, is_hidden, managed_episodes(is_hidden)")
      .eq("title_id", titleId)
      .order("season_number");
    if (error) {
      console.error("Failed to load managed seasons:", error.code, error.message);
      return null;
    }
    rows = (data ?? []) as SeasonSummaryRow[];
  }

  const byNumber = new Map(rows.map((row) => [row.season_number, row]));
  const item = (seasonNumber: number, name: string, tmdbCount: number | null): SeasonItem => {
    const row = byNumber.get(seasonNumber);
    const episodes = row?.managed_episodes ?? [];
    return {
      seasonNumber,
      name,
      episodeCount: tmdbCount ?? episodes.length,
      onTmdb: tmdbCount !== null,
      hidden: row?.is_hidden ?? false,
      hiddenEpisodes: episodes.filter((episode) => episode.is_hidden).length,
    };
  };

  const tmdbNumbers = new Set(show.seasons.map((season) => season.seasonNumber));
  return [
    ...show.seasons.map((season) => item(season.seasonNumber, season.name, season.episodeCount)),
    ...rows
      .filter((row) => !tmdbNumbers.has(row.season_number))
      .map((row) => item(row.season_number, row.tmdb_name ?? formatSeasonLabel(row.season_number), null)),
  ];
}

/** `undefined` when it couldn't be read; `null` when the season isn't imported. */
async function getManagedSeason(showId: number, seasonNumber: number): Promise<ManagedSeason | null | undefined> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("managed_seasons")
    .select(
      "id, season_number, tmdb_name, is_hidden, managed_titles!inner(tmdb_id, media_type), managed_episodes(id, episode_number, tmdb_name, tmdb_air_date, overrides, is_hidden)",
    )
    .eq("managed_titles.media_type", "tv")
    .eq("managed_titles.tmdb_id", showId)
    .eq("season_number", seasonNumber)
    .maybeSingle<SeasonRow>();
  if (error) {
    console.error("Failed to load managed season:", error.code, error.message);
    return undefined;
  }
  return data ? toManagedSeason(data) : null;
}

export type SeasonContents =
  | { ok: true; season: SeasonItem; episodes: EpisodeItem[] }
  | { ok: false; message: string };

/** One season's summary and episodes: TMDB's merged with Echo's records. */
export async function getSeasonContents(showId: number, seasonNumber: number): Promise<SeasonContents> {
  const [tmdb, managed] = await Promise.all([
    getTmdbSeasonDetails(showId, seasonNumber).catch((): SeasonDetails | null | undefined => undefined),
    getManagedSeason(showId, seasonNumber),
  ]);
  if (tmdb === undefined) return { ok: false, message: "TMDB couldn't be reached. Try again in a moment." };
  if (managed === undefined) return { ok: false, message: "Episodes couldn't be loaded. Try again in a moment." };

  const managedByNumber = new Map(managed?.episodes.map((episode) => [episode.episodeNumber, episode]));
  const tmdbByNumber = new Map(tmdb?.episodes.map((episode) => [episode.episodeNumber, episode]));
  const numbers = [...new Set([...tmdbByNumber.keys(), ...managedByNumber.keys()])].sort((a, b) => a - b);

  const episodes = numbers.map((episodeNumber): EpisodeItem => {
    const source = tmdbByNumber.get(episodeNumber);
    const record = managedByNumber.get(episodeNumber);
    const overrides = record?.overrides ?? {};
    // Episodes TMDB no longer lists are compared with what was saved when they were imported.
    const tmdbValues = source
      ? episodeTmdbValues(source)
      : { name: record?.tmdbName ?? "", overview: null, airDate: record?.tmdbAirDate ?? null, stillPath: null };
    const name = "name" in overrides ? overrides.name : tmdbValues.name;
    const airDate = "airDate" in overrides ? overrides.airDate : tmdbValues.airDate;
    return {
      episodeNumber,
      name: (typeof name === "string" && name.trim()) || `Episode ${episodeNumber}`,
      airDate: (typeof airDate === "string" && airDate) || null,
      onTmdb: Boolean(source),
      hidden: record?.hidden ?? false,
      edited: Object.keys(overrides).length > 0,
      fields: source || record ? editFields(EPISODE_FIELDS, tmdbValues, overrides) : null,
    };
  });

  return {
    ok: true,
    season: {
      seasonNumber,
      name: tmdb?.name || managed?.tmdbName || formatSeasonLabel(seasonNumber),
      episodeCount: tmdb ? tmdb.episodes.length : (managed?.episodes.length ?? 0),
      onTmdb: Boolean(tmdb),
      hidden: managed?.hidden ?? false,
      hiddenEpisodes: managed?.episodes.filter((episode) => episode.hidden).length ?? 0,
    },
    episodes,
  };
}

/** Fields for an edit dialog: TMDB's value and what Echo shows now, prefilled. */
export function editFields(
  fields: OverrideField[],
  tmdbValues: Record<string, OverrideValue | null>,
  overrides: Overrides,
  labels: Record<string, string> = {},
): EditField[] {
  return fields.map((field) => ({
    key: field.key,
    label: labels[field.key] ?? field.label,
    kind: field.kind,
    section: field.section,
    max: field.max,
    required: field.required,
    tmdbValue: toInput(tmdbValues[field.key]),
    value: toInput(field.key in overrides ? overrides[field.key] : tmdbValues[field.key]),
  }));
}

/** TMDB's values for the fields admins can edit on a movie or show. */
export function titleTmdbValues(details: MovieDetails | TvShowDetails): Record<string, OverrideValue | null> {
  return {
    title: details.title,
    tagline: details.tagline,
    overview: details.overview,
    date: details.mediaType === "movie" ? details.releaseDate : details.firstAirDate,
    genres: details.genres,
    posterPath: details.posterPath,
    backdropPath: details.backdropPath,
  };
}

/** TMDB's values for the fields admins can edit on an episode. */
export function episodeTmdbValues(episode: Episode): Record<string, OverrideValue | null> {
  return {
    name: episode.name,
    overview: episode.overview,
    airDate: episode.airDate,
    stillPath: episode.stillPath,
  };
}
