import { notFound, redirect } from "next/navigation";
import ButtonLink from "@/components/ButtonLink";
import ViewerBackdrop from "@/components/viewer/ViewerBackdrop";
import ViewerFrame, { ViewerScreen } from "@/components/viewer/ViewerFrame";
import { parseRouteNumber, titleHref, watchEpisodeHref } from "@/lib/media-routes";
import { getTvShowDetails } from "@/lib/tmdb/details";
import { getFirstEpisode } from "@/lib/viewer/queries";

// "Watch now" on a show opens its first available episode; that page checks access.
export default async function WatchShowPage({ params }: PageProps<"/watch/tv/[id]">) {
  const showId = parseRouteNumber((await params).id);
  const show = showId === null ? null : await getTvShowDetails(showId);
  if (!show) notFound();

  const first = await getFirstEpisode(show);
  if (first) {
    redirect(watchEpisodeHref(show.tmdbId, first.seasonNumber, first.episode.episodeNumber));
  }

  return (
    <ViewerFrame backHref={titleHref(show)} backLabel={`Back to ${show.title}`}>
      <ViewerScreen backdrop={<ViewerBackdrop image={{ path: show.backdropPath, size: "w1280" }} />}>
        <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
          No episodes to watch yet
        </h1>
        <p className="mt-2 text-sm text-foreground/80 sm:text-base">
          TMDB doesn&apos;t list any aired episodes of {show.title}.
        </p>
        <ButtonLink href={titleHref(show)} variant="secondary" className="mt-6 bg-background/40">
          Back to {show.title}
        </ButtonLink>
      </ViewerScreen>
    </ViewerFrame>
  );
}
