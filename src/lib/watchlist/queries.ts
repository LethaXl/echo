import "server-only";
import { prefetchTitleRules } from "@/lib/content/rules";
import { getWatchlistAccess } from "./access";
import { createClient } from "@/lib/supabase/server";
import { getWatchlistMetadata } from "./metadata";
import type { WatchlistItem } from "./model";
import type { MediaReference } from "@/types/media";

export async function getWatchlistSaved(ref: MediaReference): Promise<boolean | null> {
  const access = await getWatchlistAccess();
  if (access.status !== "member") return access.status === "error" ? null : false;
  try {
    const db = await createClient();
    const { data, error } = await db.from("watchlist").select("id")
      .eq("user_id", access.userId).eq("tmdb_id", ref.tmdbId).eq("media_type", ref.mediaType).maybeSingle();
    return error ? null : Boolean(data);
  } catch { return null; }
}

export async function getWatchlist(): Promise<{ items: WatchlistItem[]; error: boolean }> {
  const access = await getWatchlistAccess();
  if (access.status !== "member") return { items: [], error: access.status === "error" };
  try {
    const db = await createClient();
    // Page through PostgREST's default row limit instead of silently dropping older saves.
    const rows: { id: string; tmdb_id: number; media_type: "movie" | "tv"; created_at: string }[] = [];
    for (let offset = 0; ; offset += 500) {
      const { data, error } = await db.from("watchlist").select("id,tmdb_id,media_type,created_at")
        .eq("user_id", access.userId).order("created_at", { ascending: false }).order("id")
        .range(offset, offset + 499);
      if (error) throw error;
      rows.push(...(data ?? []));
      if (!data || data.length < 500) break;
    }
    prefetchTitleRules(rows.map((row) => ({ tmdbId: row.tmdb_id, mediaType: row.media_type })));
    const items = new Array<WatchlistItem>(rows.length);
    let nextIndex = 0;
    // Keep eight requests in flight without waiting for the slowest title in each batch.
    // Preserve row order regardless of which request finishes first.
    async function loadMetadata() {
      while (nextIndex < rows.length) {
        const index = nextIndex++;
        const row = rows[index];
        const ref = { tmdbId: row.tmdb_id, mediaType: row.media_type };
        let metadata = null;
        try { metadata = await getWatchlistMetadata(ref); } catch { /* Keep the removable entry. */ }
        items[index] = {
          ...ref, entryId: row.id, addedAt: row.created_at,
          title: `Unavailable title #${row.tmdb_id}`, year: null, posterPath: null, tmdbRating: null,
          ...metadata, unavailable: !metadata,
        };
      }
    }
    await Promise.all(Array.from({ length: Math.min(8, rows.length) }, () => loadMetadata()));
    return { items, error: false };
  } catch {
    return { items: [], error: true };
  }
}
