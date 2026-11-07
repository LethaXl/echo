import "server-only";
import { cache } from "react";
import { readOverrides, type Overrides } from "@/lib/content/overrides";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createIsolatedClient } from "@/lib/supabase/server";
import type {
  CatalogueItem,
  Episode,
  MediaReference,
  MovieDetails,
  TvShowDetails,
} from "@/types/media";

/**
 * Admin changes to TMDB content (US-50 to US-57), applied wherever Echo shows a title. TMDB stays
 * the source of everything an admin hasn't changed. Lookups are batched and cached per request.
 *
 * When the database can't answer, lookups throw ContentRulesError rather than guessing, so a
 * hidden title is never shown by mistake: lists show their unavailable state and detail pages
 * their error page. Only a database without the content functions (the migration isn't applied,
 * so nothing can be hidden) is treated as having no rules.
 */

export type ContentRule = { hidden: boolean; overrides: Overrides };

export class ContentRulesError extends Error {
  constructor() {
    super("Content visibility couldn't be checked.");
    this.name = "ContentRulesError";
  }
}

/** PostgREST and Postgres codes for a function that doesn't exist. */
const MISSING_FUNCTION_CODES = new Set(["PGRST202", "42883"]);

function checkRulesError(error: { code?: string; message: string } | null, what: string): boolean {
  if (!error) return true;
  if (error.code && MISSING_FUNCTION_CODES.has(error.code)) return false;
  console.error(`Failed to load ${what}:`, error.code, error.message);
  throw new ContentRulesError();
}

type RuleRow = { media_type: string; tmdb_id: number; is_hidden: boolean; overrides: unknown };
type ShowRuleRow = {
  season_number: number;
  episode_number: number | null;
  is_hidden: boolean;
  overrides: unknown;
};

/** The database function takes up to 500 IDs of each type per call. */
const BATCH_SIZE = 400;

export const contentKey = ({ mediaType, tmdbId }: MediaReference) => `${mediaType}-${tmdbId}`;

async function fetchTitleRules(refs: MediaReference[]): Promise<Map<string, ContentRule>> {
  const rules = new Map<string, ContentRule>();
  if (!isSupabaseConfigured()) return rules;

  const supabase = createIsolatedClient();
  for (let start = 0; start < refs.length; start += BATCH_SIZE) {
    const batch = refs.slice(start, start + BATCH_SIZE);
    const ids = (type: string) => batch.filter((ref) => ref.mediaType === type).map((ref) => ref.tmdbId);
    const { data, error } = await supabase.rpc("get_title_rules", {
      p_movie_ids: ids("movie"),
      p_tv_ids: ids("tv"),
    });
    if (!checkRulesError(error, "content settings")) return rules;
    for (const row of (data ?? []) as RuleRow[]) {
      if (row.media_type !== "movie" && row.media_type !== "tv") continue;
      rules.set(contentKey({ mediaType: row.media_type, tmdbId: row.tmdb_id }), {
        hidden: row.is_hidden,
        overrides: readOverrides(row.overrides),
      });
    }
  }
  return rules;
}

// React.cache is scoped to the current request, so nothing is shared between visitors.
const titleRuleStore = cache(() => new Map<string, Promise<ContentRule | null>>());

/**
 * Starts loading rules for titles not yet looked up in this request, in one call. Lists call
 * this first so lookups for each item afterwards don't query again.
 */
export function prefetchTitleRules(refs: MediaReference[]): void {
  const store = titleRuleStore();
  const seen = new Set<string>();
  const missing = refs.filter((ref) => {
    const key = contentKey(ref);
    if (store.has(key) || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  if (missing.length === 0) return;

  const batch = fetchTitleRules(missing);
  for (const ref of missing) {
    const rule = batch.then((rules) => rules.get(contentKey(ref)) ?? null);
    // A prefetched lookup nobody reads mustn't become an unhandled rejection; readers still get the error.
    rule.catch(() => {});
    store.set(contentKey(ref), rule);
  }
}

export async function getTitleRules(refs: MediaReference[]): Promise<Map<string, ContentRule>> {
  prefetchTitleRules(refs);
  const store = titleRuleStore();
  const entries = await Promise.all(
    refs.map(async (ref) => [contentKey(ref), await store.get(contentKey(ref))] as const),
  );
  const rules = new Map<string, ContentRule>();
  for (const [key, rule] of entries) if (rule) rules.set(key, rule);
  return rules;
}

export async function getTitleRule(ref: MediaReference): Promise<ContentRule | null> {
  return (await getTitleRules([ref])).get(contentKey(ref)) ?? null;
}

export type ShowRules = {
  hiddenSeasons: Set<number>;
  /** Keyed by `${seasonNumber}-${episodeNumber}`. */
  episodes: Map<string, ContentRule>;
};

const episodeKey = (seasonNumber: number, episodeNumber: number) => `${seasonNumber}-${episodeNumber}`;

/** Hidden seasons and hidden or edited episodes of a show, in one call per request. */
export const getShowRules = cache(async (showId: number): Promise<ShowRules> => {
  const rules: ShowRules = { hiddenSeasons: new Set(), episodes: new Map() };
  if (!isSupabaseConfigured()) return rules;
  const { data, error } = await createIsolatedClient().rpc("get_show_rules", { p_tmdb_id: showId });
  if (!checkRulesError(error, "season settings")) return rules;
  for (const row of (data ?? []) as ShowRuleRow[]) {
    if (row.episode_number === null) rules.hiddenSeasons.add(row.season_number);
    else {
      rules.episodes.set(episodeKey(row.season_number, row.episode_number), {
        hidden: row.is_hidden,
        overrides: readOverrides(row.overrides),
      });
    }
  }
  return rules;
});

export function getEpisodeRule(rules: ShowRules, seasonNumber: number, episodeNumber: number) {
  return rules.episodes.get(episodeKey(seasonNumber, episodeNumber)) ?? null;
}

// ---------------------------------------------------------------------------------------------
// Applying overrides
// ---------------------------------------------------------------------------------------------

function text(overrides: Overrides, key: string, fallback: string | null): string | null {
  if (!(key in overrides)) return fallback;
  const value = overrides[key];
  return typeof value === "string" ? value.trim() || null : fallback;
}

function list(overrides: Overrides, key: string, fallback: string[]): string[] {
  const value = overrides[key];
  return Array.isArray(value) ? value : fallback;
}

function yearOf(date: string | null): number | null {
  const year = Number.parseInt(date?.slice(0, 4) ?? "", 10);
  return Number.isFinite(year) ? year : null;
}

export function applyCatalogueOverrides<T extends CatalogueItem>(item: T, overrides: Overrides): T {
  return {
    ...item,
    title: text(overrides, "title", item.title) ?? item.title,
    year: "date" in overrides ? yearOf(text(overrides, "date", null)) : item.year,
    posterPath: text(overrides, "posterPath", item.posterPath),
  };
}

function applyDetailOverrides<T extends MovieDetails | TvShowDetails>(details: T, overrides: Overrides): T {
  return {
    ...applyCatalogueOverrides(details, overrides),
    tagline: text(overrides, "tagline", details.tagline),
    overview: text(overrides, "overview", details.overview),
    genres: list(overrides, "genres", details.genres),
    backdropPath: text(overrides, "backdropPath", details.backdropPath),
  };
}

export function applyMovieOverrides(movie: MovieDetails, overrides: Overrides): MovieDetails {
  return {
    ...applyDetailOverrides(movie, overrides),
    releaseDate: text(overrides, "date", movie.releaseDate),
  };
}

export function applyTvOverrides(show: TvShowDetails, overrides: Overrides): TvShowDetails {
  return {
    ...applyDetailOverrides(show, overrides),
    firstAirDate: text(overrides, "date", show.firstAirDate),
  };
}

export function applyEpisodeOverrides(episode: Episode, overrides: Overrides): Episode {
  return {
    ...episode,
    name: text(overrides, "name", episode.name) ?? episode.name,
    overview: text(overrides, "overview", episode.overview),
    airDate: text(overrides, "airDate", episode.airDate),
    stillPath: text(overrides, "stillPath", episode.stillPath),
  };
}

/** Drops hidden titles from a list and applies admin edits to the rest. */
export async function applyTitleRules<T extends CatalogueItem>(items: T[]): Promise<T[]> {
  if (items.length === 0) return items;
  const rules = await getTitleRules(items);
  return items.flatMap((item) => {
    const rule = rules.get(contentKey(item));
    if (!rule) return [item];
    return rule.hidden ? [] : [applyCatalogueOverrides(item, rule.overrides)];
  });
}
