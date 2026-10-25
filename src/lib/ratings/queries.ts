import "server-only";
import { createClient } from "@/lib/supabase/server";
import { getWatchlistAccess } from "@/lib/watchlist/access";
import { getWatchlistMetadata } from "@/lib/watchlist/metadata";
import type { MediaReference } from "@/types/media";
import type { RatedItem, RatingValue } from "./model";

type RatingRow = {
  id: string;
  tmdb_id: number;
  media_type: "movie" | "tv";
  rating: RatingValue;
  updated_at: string;
};

export async function getTitleRating(item: MediaReference): Promise<{ ok: boolean; rating: RatingValue | null }> {
  const access = await getWatchlistAccess();
  if (access.status !== "member") return { ok: false, rating: null };
  try {
    const db = await createClient();
    const { data, error } = await db.from("ratings").select("rating")
      .eq("user_id", access.userId).eq("tmdb_id", item.tmdbId).eq("media_type", item.mediaType)
      .maybeSingle<{ rating: RatingValue }>();
    return { ok: !error, rating: data?.rating ?? null };
  } catch { return { ok: false, rating: null }; }
}

export async function getRatedTitles(): Promise<{ ok: boolean; items: RatedItem[] }> {
  const access = await getWatchlistAccess();
  if (access.status !== "member") return { ok: false, items: [] };
  try {
    const db = await createClient();
    const rows: RatingRow[] = [];
    for (let offset = 0; ; offset += 500) {
      const { data, error } = await db.from("ratings").select("id,tmdb_id,media_type,rating,updated_at")
        .eq("user_id", access.userId).order("updated_at", { ascending: false }).order("id")
        .range(offset, offset + 499);
      if (error) return { ok: false, items: [] };
      rows.push(...(data ?? []));
      if (!data || data.length < 500) break;
    }
    const items = new Array<RatedItem>(rows.length);
    let nextIndex = 0;
    async function loadMetadata() {
      while (nextIndex < rows.length) {
        const index = nextIndex++;
        const row = rows[index];
        const ref = { tmdbId: row.tmdb_id, mediaType: row.media_type };
        let metadata = null;
        try { metadata = await getWatchlistMetadata(ref); } catch { /* Keep the removable rating. */ }
        items[index] = {
          ...ref, title: `Unavailable title #${row.tmdb_id}`, year: null, posterPath: null, tmdbRating: null,
          ...metadata, entryId: row.id, rating: row.rating, ratedAt: row.updated_at, unavailable: !metadata,
        };
      }
    }
    await Promise.all(Array.from({ length: Math.min(8, rows.length) }, () => loadMetadata()));
    return { ok: true, items };
  } catch { return { ok: false, items: [] }; }
}
