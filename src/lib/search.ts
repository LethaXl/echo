const MAX_QUERY_LENGTH = 100;

/** Trims and collapses whitespace so "  the   office " and "the office" are the same search. */
export function normalizeSearchQuery(value: string | string[] | undefined): string {
  const text = typeof value === "string" ? value : "";
  return text.trim().replace(/\s+/g, " ").slice(0, MAX_QUERY_LENGTH);
}
