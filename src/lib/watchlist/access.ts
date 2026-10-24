import "server-only";
import { cache } from "react";
import { getCurrentUser } from "@/lib/auth/session";
import { lookUpSubscription } from "@/lib/subscriptions/queries";

type WatchlistAccess =
  | { status: "guest" }
  | { status: "free" }
  | { status: "error" }
  | { status: "member"; userId: string };

/** Shared by the UI and reads, memoized only within this server request. */
export const getWatchlistAccess = cache(async (): Promise<WatchlistAccess> => {
  try {
    const user = await getCurrentUser();
    if (!user) return { status: "guest" };
    const lookup = await lookUpSubscription(user.id);
    if (!lookup.ok) return { status: "error" };
    return lookup.subscription ? { status: "member", userId: user.id } : { status: "free" };
  } catch {
    return { status: "error" };
  }
});
