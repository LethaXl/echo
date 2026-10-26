import Link from "next/link";
import EchoPlus from "@/components/EchoPlus";
import { getWatchlistAccess } from "@/lib/watchlist/access";
import { getTitleRating } from "@/lib/ratings/queries";
import RatingDialog from "./RatingDialog";
import type { CatalogueItem } from "@/types/media";

export default async function TitleRating({ item }: { item: CatalogueItem }) {
  const access = await getWatchlistAccess();
  if (access.status === "guest") return null;
  if (access.status === "free") {
    return (
      <p className="text-sm text-muted">
        Your Echo Rating · <Link href="/plans" className="rounded-sm text-foreground hover:underline">Rate this title with <EchoPlus /></Link>
      </p>
    );
  }
  const result = access.status === "error" ? { ok: false, rating: null } : await getTitleRating(item);
  if (!result.ok) return <p role="alert" className="text-sm text-muted">Your rating couldn&apos;t be loaded. Refresh to try again.</p>;
  return <RatingDialog key={access.status === "member" ? `${access.userId}:${item.mediaType}:${item.tmdbId}` : undefined} item={item} rating={result.rating} />;
}
