import type { CatalogueItem } from "@/types/media";

/** Stable variety from URL data, without randomness during rendering. */
export function echoSelectionIndex(seed: string, count: number): number {
  let hash = 2166136261;
  for (let index = 0; index < seed.length; index++) {
    hash = Math.imul(hash ^ seed.charCodeAt(index), 16777619);
  }
  return count > 0 ? (hash >>> 0) % count : 0;
}

/** Only select poster paths the TMDB image service can use. */
export function hasEchoPoster(item: CatalogueItem): boolean {
  return /^\/[A-Za-z0-9_-]+\.(jpg|jpeg|png|webp)$/i.test(item.posterPath ?? "");
}

export type EchoCandidate = CatalogueItem & {
  genreIds?: number[];
  genreNames?: string[];
  overview?: string;
  keywords?: string[];
  collectionId?: number | null;
  /** TMDB's title, separate from an admin's display-title override. */
  franchiseTitle?: string;
};

// These describe packaging or very broad story elements, not a convincing subject match.
const GENERIC_KEYWORDS = new Set([
  "based on novel or book", "based on a true story", "based on comic", "based on comic book",
  "based on marvel comic", "based on dc comic", "sequel", "prequel", "remake", "reboot",
  "murder", "death", "violence", "revenge", "police", "investigation", "crime", "drama",
  "action", "thriller", "science fiction", "friendship", "family", "love", "romance",
]);
const STOP_WORDS = new Set((
  "a an the and or but in on at to of for from with without by is are was were be been " +
  "this that their they them his her she he it its as into after before when while who " +
  "has have had will must can new life lives world story series film movie follows young " +
  "man woman people find discovers becomes against about through one two"
).split(" "));

const normalize = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const words = (value: string) => new Set(normalize(value).split(" ")
  .filter((word) => word.length > 2 && !STOP_WORDS.has(word)));
const keywordsOf = (title: EchoCandidate) => new Set((title.keywords ?? [])
  .map(normalize).filter((keyword) => keyword && !GENERIC_KEYWORDS.has(keyword)));
const intersection = <T,>(first: ReadonlySet<T>, second: ReadonlySet<T>) =>
  [...first].filter((value) => second.has(value));

// Preserve explicit subject areas across a step, rather than drifting through a broad genre.
const SUBJECTS = [
  /\b(superhero|supervillain|super power|superhuman|secret identity)\b/,
  /\b(serial killer|serial murder|serial murderer)\b/,
];

function sameNamedFranchise(current: EchoCandidate, candidate: EchoCandidate): boolean {
  const first = normalize((current.franchiseTitle ?? "").split(":")[0]);
  const second = normalize((candidate.franchiseTitle ?? "").split(":")[0]);
  // A shared explicit series prefix, never a guessed match on one common title word.
  return first.length >= 3 && words(first).size > 0 && first === second;
}

/** Zero means ineligible: neither genre overlap nor recommendation rank can pass the gate. */
export function echoSimilarityScore(
  current: EchoCandidate,
  candidate: EchoCandidate,
  collectionMembers: ReadonlySet<number>,
): number {
  if (current.mediaType !== candidate.mediaType) return 0;
  const sameCollection = current.mediaType === "movie" && (
    collectionMembers.has(candidate.tmdbId) || (current.collectionId != null
      && current.collectionId === candidate.collectionId)
  );
  if (sameCollection) return 1000;

  const first = keywordsOf(current);
  const second = keywordsOf(candidate);
  const shared = intersection(first, second);
  const universe = shared.some((keyword) => /\b(cinematic universe|expanded universe|arrowverse)\b/.test(keyword));
  if (universe || (shared.length > 0 && sameNamedFranchise(current, candidate))) return 800;

  if (SUBJECTS.some((subject) => [...first].some((keyword) => subject.test(keyword))
    && ![...second].some((keyword) => subject.test(keyword)))) return 0;

  const genres = current.genreNames && candidate.genreNames
    ? intersection(new Set(current.genreNames.map(normalize)), new Set(candidate.genreNames.map(normalize))).length
    : intersection(new Set(current.genreIds ?? []), new Set(candidate.genreIds ?? [])).length;
  const coverage = shared.length / Math.max(1, Math.min(first.size, second.size));
  const overviewWords = intersection(words(current.overview ?? ""), words(candidate.overview ?? ""));
  // A single detailed subject needs independent corroboration in both synopses.
  const detailedSubject = shared.some((keyword) => words(keyword).size >= 2
    && normalize(current.overview ?? "").includes(keyword)
    && normalize(candidate.overview ?? "").includes(keyword));
  const themesMatch = shared.length >= 2 && coverage >= 0.25;
  if ((!themesMatch && !detailedSubject) || genres === 0) return 0;
  if (!themesMatch && overviewWords.length < 3) return 0;

  // Subject evidence dominates; genres only support an already-qualified match.
  return 100 + Math.min(shared.length, 5) * 20 + Math.round(coverage * 10)
    + Math.min(overviewWords.length, 5) + Math.min(genres, 3);
}

/** Cheap shortlist ordering uses synopses already returned in TMDB lists, not extra calls. */
export function echoShortlistScore(current: EchoCandidate, candidate: EchoCandidate): number {
  const sharedWords = intersection(words(current.overview ?? ""), words(candidate.overview ?? "")).length;
  const keywordMentions = [...keywordsOf(current)].filter((keyword) =>
    normalize(candidate.overview ?? "").includes(keyword)).length;
  return (sameNamedFranchise(current, candidate) ? 100 : 0) + keywordMentions * 10 + sharedWords;
}

/** TMDB order breaks similarity ties; variety is limited to its top three tied matches. */
export function selectEchoCandidate(
  current: EchoCandidate,
  candidates: EchoCandidate[],
  collectionMembers: ReadonlySet<number>,
  seed: string,
): EchoCandidate | undefined {
  const ranked = candidates.map((item, rank) => ({
    item, rank, score: echoSimilarityScore(current, item, collectionMembers),
  })).filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score || a.rank - b.rank);
  const best = ranked[0];
  if (!best) return undefined;
  const pool = ranked.filter(({ score }) => score === best.score).slice(0, 3);
  return pool[echoSelectionIndex(seed, pool.length)].item;
}
