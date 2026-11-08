import type { MediaType } from "@/types/media";

export type CuratedEcho = {
  label: string;
  mediaType: MediaType;
  tmdbIds: readonly number[];
};

// IDs and order verified against TMDB search and detail records on 2026-11-07.
// Verification fixtures live in tests/fixtures/curated-echo-resolution.json.
export const CURATED_ECHOES: readonly CuratedEcho[] = [
  { label: "Avengers", mediaType: "movie", tmdbIds: [24428, 99861, 299536, 299534, 271110] },
  { label: "Spider-Man", mediaType: "movie", tmdbIds: [315635, 429617, 634649, 1930, 102382] },
  { label: "Batman", mediaType: "movie", tmdbIds: [272, 155, 49026] },
  { label: "Pirates of the Caribbean", mediaType: "movie", tmdbIds: [22, 58, 285, 1865, 166426] },
  { label: "Harry Potter", mediaType: "movie", tmdbIds: [671, 672, 673, 674, 675] },
  { label: "The Lord of the Rings", mediaType: "movie", tmdbIds: [120, 121, 122, 49051, 57158] },
  { label: "Indiana Jones", mediaType: "movie", tmdbIds: [85, 87, 89, 217, 335977] },
  { label: "John Wick", mediaType: "movie", tmdbIds: [245891, 324552, 458156, 603692, 541671] },
  { label: "Mission: Impossible", mediaType: "movie", tmdbIds: [954, 955, 956, 56292, 177677] },
  { label: "Fast & Furious", mediaType: "movie", tmdbIds: [9799, 584, 9615, 13804, 51497] },
  { label: "Die Hard", mediaType: "movie", tmdbIds: [562, 1573, 1572, 1571, 47964] },
  { label: "Final Destination", mediaType: "movie", tmdbIds: [9532, 9358, 9286, 19912, 55779] },
  { label: "Scream", mediaType: "movie", tmdbIds: [4232, 4233, 4234, 41446, 646385] },
  { label: "The Hunger Games", mediaType: "movie", tmdbIds: [70160, 101299, 131631, 131634, 695721] },
  { label: "Toy Story", mediaType: "movie", tmdbIds: [862, 863, 10193, 301528, 1084244] },
  { label: "Kung Fu Panda", mediaType: "movie", tmdbIds: [9502, 49444, 140300, 1011985] },
  { label: "Shrek", mediaType: "movie", tmdbIds: [808, 809, 810, 10192, 417859] },
  { label: "Star Wars", mediaType: "movie", tmdbIds: [1893, 1894, 1895, 11, 1891] },
  { label: "Men in Black", mediaType: "movie", tmdbIds: [607, 608, 41154, 479455] },
  { label: "Dexter Universe", mediaType: "tv", tmdbIds: [1405, 131927, 219937, 259909] },
];
