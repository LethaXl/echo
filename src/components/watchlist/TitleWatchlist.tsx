import ButtonLink from "@/components/ButtonLink";
import WatchlistButton from "./WatchlistButton";
import EchoPlus from "@/components/EchoPlus";
import { getWatchlistAccess } from "@/lib/watchlist/access";
import { getWatchlistSaved } from "@/lib/watchlist/queries";
import type { MediaReference } from "@/types/media";

export default async function TitleWatchlist({ item }: { item: MediaReference }) {
  const access = await getWatchlistAccess();
  if (access.status === "guest") return null;
  if (access.status === "free") return (
    <ButtonLink href="/plans" variant="secondary" size="lg">Save &amp; track with <EchoPlus /></ButtonLink>
  );
  if (access.status === "error") return <p role="alert" className="text-sm text-muted">Echo+ access unavailable. Refresh to try again.</p>;
  const saved = await getWatchlistSaved(item);
  if (saved === null) return <p role="alert" className="text-sm text-muted">Watchlist unavailable. Refresh to try again.</p>;
  return <WatchlistButton key={access.userId} item={item} saved={saved} />;
}
