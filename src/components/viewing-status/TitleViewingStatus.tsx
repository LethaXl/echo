import { getWatchlistAccess } from "@/lib/watchlist/access";
import { getTitleViewingStatus } from "@/lib/viewing-status/queries";
import ViewingStatusControl from "./ViewingStatusControl";
import type { MediaReference } from "@/types/media";

export default async function TitleViewingStatus({ item }: { item: MediaReference & { title: string } }) {
  const access = await getWatchlistAccess();
  // TitleWatchlist provides the shared login / Echo+ upgrade action.
  if (access.status === "guest" || access.status === "free") return null;
  const result = access.status === "error" ? { ok: false, status: null } : await getTitleViewingStatus(item);
  if (!result.ok) {
    return <p role="alert" className="text-sm text-muted">Viewing status unavailable. Refresh to try again.</p>;
  }
  return <ViewingStatusControl key={access.status === "member" ? access.userId : undefined} item={item} status={result.status} />;
}
