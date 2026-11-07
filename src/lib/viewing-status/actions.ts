"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { lookUpSubscription } from "@/lib/subscriptions/queries";
import { validReference } from "@/lib/watchlist/model";
import { getWatchlistMetadata } from "@/lib/watchlist/metadata";
import { validViewingStatus, type ViewingStatus } from "./model";
import type { MediaType } from "@/types/media";

export async function setViewingStatus(tmdbId: number, mediaType: MediaType, status: ViewingStatus | null) {
  if (!validReference(tmdbId, mediaType) || !validViewingStatus(status)) {
    return { ok: false, message: "Choose a valid title and viewing status." };
  }
  if (!isSupabaseConfigured()) return { ok: false, message: "Viewing status is unavailable right now." };
  try {
    const db = await createClient();
    const { data: { user }, error: authError } = await db.auth.getUser();
    if (authError || !user) return { ok: false, message: "Log in to manage viewing status." };
    const lookup = await lookUpSubscription(user.id);
    if (!lookup.ok) return { ok: false, message: "Your Echo+ access couldn't be checked. Please try again." };
    if (!lookup.subscription) return { ok: false, message: "Echo+ is required to manage viewing status." };
    // Clearing remains possible for a title that TMDB no longer carries.
    if (status !== null && !(await getWatchlistMetadata({ tmdbId, mediaType }))) {
      return { ok: false, message: "This title isn't available on Echo. You can still clear its status." };
    }
    const { error } = status === null
      ? await db.from("viewing_status").delete().eq("user_id", user.id)
          .eq("tmdb_id", tmdbId).eq("media_type", mediaType)
      : await db.from("viewing_status").upsert(
          { user_id: user.id, tmdb_id: tmdbId, media_type: mediaType, status },
          { onConflict: "user_id,tmdb_id,media_type" },
        );
    if (error) return { ok: false, message: "Viewing status couldn't be updated. Please try again." };
  } catch {
    return { ok: false, message: "We couldn't reach your viewing activity. Please try again." };
  }
  revalidatePath("/cave");
  revalidatePath(`/${mediaType}/${tmdbId}`);
  return { ok: true, message: status === null ? "Viewing status cleared." : "Viewing status saved." };
}
