import ButtonLink from "@/components/ButtonLink";
import WatchlistButton from "./WatchlistButton";
import EchoPlus from "@/components/EchoPlus";
import { getWatchlistAccess } from "@/lib/watchlist/access";
import { titleHref } from "@/lib/media-routes";
import { getWatchlistSaved } from "@/lib/watchlist/queries";
import type { MediaReference } from "@/types/media";

export default async function TitleWatchlist({ item }: { item: MediaReference }) {
  const access = await getWatchlistAccess();
  if (access.status === "guest") return <ButtonLink variant="secondary" size="lg"
    href={`/login?next=${encodeURIComponent(titleHref(item))}`}>Log in to save</ButtonLink>;
  if (access.status === "free") return (
    <ButtonLink href="/plans" variant="secondary" size="lg">Save with <EchoPlus /></ButtonLink>
  );
  if (access.status === "error") return <p role="alert" className="text-sm text-muted">Echo+ access unavailable. Refresh to try again.</p>;
  const saved = await getWatchlistSaved(item);
  if (saved === null) return <p role="alert" className="text-sm text-muted">Watchlist unavailable. Refresh to try again.</p>;
  return <WatchlistButton key={access.userId} item={item} saved={saved} />;
}
