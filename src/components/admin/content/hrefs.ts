export const adminContentHref = ({ mediaType, tmdbId }: { mediaType: string; tmdbId: number }) =>
  `/admin/content/${mediaType}/${tmdbId}`;

/** /admin/content with only the settings that differ from the defaults. */
export function contentListHref({ query = "", page = 1 }: { query?: string; page?: number } = {}) {
  const search = new URLSearchParams();
  if (query) search.set("q", query);
  else if (page > 1) search.set("page", String(page));
  const text = search.toString();
  return text ? `/admin/content?${text}` : "/admin/content";
}
