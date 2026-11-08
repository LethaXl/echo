import "server-only";
import { applyTitleRules } from "@/lib/content/rules";
import { CURATED_ECHOES, type CuratedEcho } from "@/lib/curated-echoes";
import { echoSelectionIndex, hasEchoPoster } from "@/lib/echo";
import { getEchoTrail, normalizeMovie, normalizeTvShow } from "@/lib/tmdb/catalogue";
import { isTmdbConfigured, tmdbFetch } from "@/lib/tmdb/client";
import type { TmdbMovieResult, TmdbTvResult } from "@/lib/tmdb/types";
import type { CatalogueItem } from "@/types/media";

const MINIMUM_TITLES = 3;
const SOURCE_ATTEMPTS = 5;
const titleKey = (title: CatalogueItem) => `${title.mediaType}-${title.tmdbId}`;
const curatedKey = (chain: CuratedEcho) => `curated:${chain.label}`;

export type DiscoveryEcho = {
  id: string;
  start: CatalogueItem;
  related: CatalogueItem[];
};

type DiscoveryOptions = {
  echo: string | string[] | undefined;
  seed: string;
  echoFrom: string | string[] | undefined;
  previous: string | string[] | undefined;
};

/** Fetch actual TMDB metadata; a missing entry never changes the curated order. */
export async function getCuratedEcho(chain: CuratedEcho): Promise<DiscoveryEcho | null> {
  if (!isTmdbConfigured()) return null;
  const ids = [...new Set(chain.tmdbIds)].slice(0, 5);
  const titles = await Promise.all(ids.map(async (id): Promise<CatalogueItem | null> => {
    try {
      return chain.mediaType === "movie"
        ? normalizeMovie(await tmdbFetch<TmdbMovieResult>(`/movie/${id}`, { language: "en-US" }))
        : normalizeTvShow(await tmdbFetch<TmdbTvResult>(`/tv/${id}`, { language: "en-US" }));
    } catch (error) {
      console.error("Failed to load curated Echo title:", error instanceof Error ? error.message : error);
      return null;
    }
  }));
  try {
    // Check all surviving entries in one batch, including poster overrides, before eligibility.
    const visible = await applyTitleRules(titles.filter((title) => title !== null));
    const eligible = visible.filter(hasEchoPoster);
    if (eligible.length < MINIMUM_TITLES) return null;
    return { id: curatedKey(chain), start: eligible[0], related: eligible.slice(1) };
  } catch (error) {
    console.error("Failed to check curated Echo content:", error instanceof Error ? error.message : error);
    return null;
  }
}

/** Prefer either source evenly by seed; exhaust bounded alternatives before repeating. */
export async function getDiscoveryEcho(
  trending: CatalogueItem[] | null,
  options: DiscoveryOptions,
): Promise<DiscoveryEcho | null> {
  const { seed, echoFrom, previous } = options;
  const starts = trending?.filter(hasEchoPoster) ?? [];
  const index = Number.parseInt(typeof options.echo === "string" ? options.echo : "", 10);
  const requestedIndex = starts.length > 0 && Number.isFinite(index) && index >= 0 ? index % starts.length : 0;
  const isRepeat = (selection: DiscoveryEcho) => selection.id === previous || titleKey(selection.start) === echoFrom;
  let repeat: DiscoveryEcho | null = null;
  const attemptedCurated = new Set<string>();
  const attemptedDynamic = new Set<string>();

  const dynamic = async (): Promise<DiscoveryEcho | null> => {
    let remaining = starts.map((start, index) => ({ start, index }));
    for (let attempt = 0; attempt < SOURCE_ATTEMPTS && remaining.length > 0; attempt++) {
      const alternatives = remaining.filter(({ start }) => titleKey(start) !== echoFrom);
      const pool = alternatives.length > 0 ? alternatives : remaining;
      const requested = attempt === 0 ? pool.find(({ index }) => index === requestedIndex) : undefined;
      const candidate = requested ?? pool[echoSelectionIndex(`${seed}:retry:${attempt}`, pool.length)];
      remaining = remaining.filter(({ start }) => titleKey(start) !== titleKey(candidate.start));
      attemptedDynamic.add(titleKey(candidate.start));
      const related = await getEchoTrail(candidate.start, seed);
      if (related.length + 1 < MINIMUM_TITLES) continue;
      const result = { id: `dynamic:${titleKey(candidate.start)}`, start: candidate.start, related };
      if (isRepeat(result)) repeat ??= result;
      else return result;
    }
    return null;
  };

  const curated = async (): Promise<DiscoveryEcho | null> => {
    let remaining = [...CURATED_ECHOES];
    for (let attempt = 0; attempt < SOURCE_ATTEMPTS && remaining.length > 0; attempt++) {
      const alternatives = remaining.filter((chain) => curatedKey(chain) !== previous
        && `${chain.mediaType}-${chain.tmdbIds[0]}` !== echoFrom);
      const pool = alternatives.length > 0 ? alternatives : remaining;
      const chain = pool[echoSelectionIndex(`${seed}:curated:${attempt}`, pool.length)];
      remaining = remaining.filter((entry) => entry !== chain);
      attemptedCurated.add(curatedKey(chain));
      const result = await getCuratedEcho(chain);
      if (!result) continue;
      if (isRepeat(result)) repeat ??= result;
      else return result;
    }
    return null;
  };

  const sources = echoSelectionIndex(`${seed}:source`, 2) === 0 ? [dynamic, curated] : [curated, dynamic];
  for (const source of sources) {
    const result = await source();
    if (result) return result;
  }
  // When alternatives are unavailable, reusing a valid previous chain beats disappearing.
  // At most one extra curated attempt, only for a known previous selection.
  const previousChain = CURATED_ECHOES.find((chain) => curatedKey(chain) === previous);
  if (!repeat && previousChain && !attemptedCurated.has(curatedKey(previousChain))) {
    repeat = await getCuratedEcho(previousChain);
  }
  const previousStart = starts.find((start) => `dynamic:${titleKey(start)}` === previous);
  if (!repeat && previousStart && !attemptedDynamic.has(titleKey(previousStart))) {
    const related = await getEchoTrail(previousStart, seed);
    if (related.length + 1 >= MINIMUM_TITLES) {
      repeat = { id: `dynamic:${titleKey(previousStart)}`, start: previousStart, related };
    }
  }
  return repeat;
}
