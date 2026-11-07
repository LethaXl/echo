"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { lookUpSubscription } from "@/lib/subscriptions/queries";
import { validReference } from "@/lib/watchlist/model";
import { getWatchlistMetadata } from "@/lib/watchlist/metadata";
import { validRating } from "./model";
import type { MediaType } from "@/types/media";

export async function setMyRating(tmdbId: number, mediaType: MediaType, rating: number | null) {
  if (!validReference(tmdbId, mediaType) || !validRating(rating)) {
    return { ok: false, message: "Choose a valid title and a whole-number rating from 1 to 5." };
  }
  if (!isSupabaseConfigured()) return { ok: false, message: "Ratings are unavailable right now." };
  try {
    const db = await createClient();
    const { data: { user }, error: authError } = await db.auth.getUser();
    if (authError || !user) return { ok: false, message: "Log in to manage your ratings." };
    // These checks are independent; neither needs to wait for the other before the write.
    const [lookup, metadata] = await Promise.all([
      lookUpSubscription(user.id),
      rating === null ? Promise.resolve(null) : getWatchlistMetadata({ tmdbId, mediaType }),
    ]);
    if (!lookup.ok) return { ok: false, message: "Your Echo+ access couldn't be checked. Please try again." };
    if (!lookup.subscription) return { ok: false, message: "Echo+ is required to manage ratings." };
    if (rating !== null && !metadata) {
      return { ok: false, message: "This title isn't available on Echo. You can still clear its rating." };
    }
    const { error } = rating === null
      ? await db.from("ratings").delete().eq("user_id", user.id)
          .eq("tmdb_id", tmdbId).eq("media_type", mediaType)
      : await db.from("ratings").upsert(
          { user_id: user.id, tmdb_id: tmdbId, media_type: mediaType, rating },
          { onConflict: "user_id,tmdb_id,media_type" },
        );
    if (error) return { ok: false, message: "Your rating couldn't be saved. Please try again." };
  } catch {
    return { ok: false, message: "We couldn't reach your ratings. Please try again." };
  }
  revalidatePath("/cave");
  revalidatePath(`/${mediaType}/${tmdbId}`);
  return { ok: true, message: rating === null ? "Rating cleared." : "Rating saved." };
}
