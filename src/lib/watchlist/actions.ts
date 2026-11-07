"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { lookUpSubscription } from "@/lib/subscriptions/queries";
import { validReference } from "./model";
import { getWatchlistMetadata } from "./metadata";
import type { MediaType } from "@/types/media";

export async function setWatchlistSaved(tmdbId: number, mediaType: MediaType, saved: boolean) {
  if (!validReference(tmdbId, mediaType) || typeof saved !== "boolean") {
    return { ok: false, message: "Choose a valid movie or TV show." };
  }
  if (!isSupabaseConfigured()) return { ok: false, message: "Watchlist is unavailable right now." };
  try {
    const db = await createClient();
    const { data: { user }, error: authError } = await db.auth.getUser();
    if (authError || !user) return { ok: false, message: "Log in to manage your watchlist." };
    const lookup = await lookUpSubscription(user.id);
    if (!lookup.ok) return { ok: false, message: "Your Echo+ access couldn't be checked. Please try again." };
    if (!lookup.subscription) return { ok: false, message: "Echo+ is required to manage your watchlist. View plans to unlock it." };
    if (saved && !(await getWatchlistMetadata({ tmdbId, mediaType }))) {
      return { ok: false, message: "This title isn't available on Echo." };
    }
    const { error } = saved
      ? await db.from("watchlist").upsert({ user_id: user.id, tmdb_id: tmdbId, media_type: mediaType },
          { onConflict: "user_id,tmdb_id,media_type", ignoreDuplicates: true })
      : await db.from("watchlist").delete().eq("user_id", user.id)
          .eq("tmdb_id", tmdbId).eq("media_type", mediaType);
    if (error) return { ok: false, message: "Your watchlist couldn't be updated. Please try again." };
  } catch {
    return { ok: false, message: "We couldn't reach your watchlist. Please try again." };
  }
  revalidatePath("/cave");
  revalidatePath(`/${mediaType}/${tmdbId}`);
  return { ok: true, message: saved ? "Added to your watchlist." : "Removed from your watchlist." };
}
