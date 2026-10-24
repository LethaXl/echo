import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { getWatchlistAccess } from "@/lib/watchlist/access";
import { getWatchlistMetadata } from "@/lib/watchlist/metadata";
import type { MediaReference } from "@/types/media";
import type { ViewingItem, ViewingStatus } from "./model";

type ViewingRow = {
  id: string;
  tmdb_id: number;
  media_type: "movie" | "tv";
  status: ViewingStatus;
  updated_at: string;
  created_at: string;
};

type ViewingRowsResult = { ok: true; rows: ViewingRow[] } | { ok: false };

// React.cache is scoped to this request, never shared between users or requests.
export const getViewingRows = cache(async (): Promise<ViewingRowsResult> => {
  const access = await getWatchlistAccess();
  if (access.status !== "member") return { ok: false };
  try {
    const db = await createClient();
    const rows: ViewingRow[] = [];
    for (let offset = 0; ; offset += 500) {
      const { data, error } = await db.from("viewing_status")
        .select("id,tmdb_id,media_type,status,updated_at,created_at")
        .eq("user_id", access.userId).order("updated_at", { ascending: false }).order("id")
        .range(offset, offset + 499);
      if (error) return { ok: false };
      rows.push(...(data ?? []));
      if (!data || data.length < 500) break;
    }
    return { ok: true, rows };
  } catch { return { ok: false }; }
});

export async function getTitleViewingStatus(item: MediaReference): Promise<{ ok: boolean; status: ViewingStatus | null }> {
  const access = await getWatchlistAccess();
  if (access.status !== "member") return { ok: false, status: null };
  try {
    const db = await createClient();
    const { data, error } = await db.from("viewing_status").select("status")
      .eq("user_id", access.userId).eq("tmdb_id", item.tmdbId).eq("media_type", item.mediaType)
      .maybeSingle<{ status: ViewingStatus }>();
    return { ok: !error, status: data?.status ?? null };
  } catch { return { ok: false, status: null }; }
}

export async function getViewingActivity(): Promise<{ ok: boolean; items: ViewingItem[] }> {
  const result = await getViewingRows();
  if (!result.ok) return { ok: false, items: [] };
  const items = new Array<ViewingItem>(result.rows.length);
  let nextIndex = 0;
  async function loadMetadata() {
    while (nextIndex < resultRows.length) {
      const index = nextIndex++;
      const row = resultRows[index];
      const ref = { tmdbId: row.tmdb_id, mediaType: row.media_type };
      let metadata = null;
      try { metadata = await getWatchlistMetadata(ref); } catch { /* Keep the clearable entry. */ }
      items[index] = {
        ...ref, title: `Unavailable title #${row.tmdb_id}`, year: null, posterPath: null, tmdbRating: null,
        ...metadata, entryId: row.id, status: row.status, updatedAt: row.updated_at, addedAt: row.created_at, unavailable: !metadata,
      };
    }
  }
  const resultRows = result.rows;
  await Promise.all(Array.from({ length: Math.min(8, resultRows.length) }, () => loadMetadata()));
  return { ok: true, items };
}
