import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ButtonLink from "@/components/ButtonLink";
import SimulatedPlayer from "@/components/viewer/SimulatedPlayer";
import ViewerBackdrop from "@/components/viewer/ViewerBackdrop";
import ViewerFrame, { ViewerScreen } from "@/components/viewer/ViewerFrame";
import WatchUpgradePrompt from "@/components/viewer/WatchUpgradePrompt";
import { formatCalendarDate } from "@/lib/format";
import { parseRouteNumber, titleHref, watchEpisodeHref } from "@/lib/media-routes";
import { hasEchoPlus } from "@/lib/subscriptions/queries";
import { getTvShowDetails } from "@/lib/tmdb/details";
import { getEpisodeViewer, requireSignedIn } from "@/lib/viewer/queries";

type WatchEpisodePageProps =
  PageProps<"/watch/tv/[id]/season/[seasonNumber]/episode/[episodeNumber]">;

async function parseEpisode(params: WatchEpisodePageProps["params"]) {
  const { id, seasonNumber, episodeNumber } = await params;
  const ref = {
    showId: parseRouteNumber(id),
    seasonNumber: parseRouteNumber(seasonNumber),
    episodeNumber: parseRouteNumber(episodeNumber),
  };
  if (ref.showId === null || ref.seasonNumber === null || ref.episodeNumber === null) notFound();
  return { showId: ref.showId, seasonNumber: ref.seasonNumber, episodeNumber: ref.episodeNumber };
}

async function loadShow(showId: number) {
  const show = await getTvShowDetails(showId);
  if (!show) notFound();
  return show;
}

export async function generateMetadata({ params }: WatchEpisodePageProps): Promise<Metadata> {
  const { showId, seasonNumber, episodeNumber } = await parseEpisode(params);
  const show = await loadShow(showId);
  return { title: `Watch ${show.title} · S${seasonNumber} E${episodeNumber}` };
}

// US-32 Open the Simulated Viewer (episodes), US-35 Open the Next Episode
export default async function WatchEpisodePage({ params, searchParams }: WatchEpisodePageProps) {
  const { showId, seasonNumber, episodeNumber } = await parseEpisode(params);
  // Checked here on every request, so typing or refreshing the URL can't skip it.
  await requireSignedIn(watchEpisodeHref(showId, seasonNumber, episodeNumber));

  const [show, echoPlus, { autoplay }] = await Promise.all([
    loadShow(showId),
    hasEchoPlus(),
    searchParams,
  ]);
  const showBackdrop = { path: show.backdropPath, size: "w1280" } as const;

  if (!echoPlus) {
    return (
      <WatchUpgradePrompt
        title={show.title}
        backdrop={showBackdrop}
        backHref={titleHref(show)}
        backLabel={`Back to ${show.title}`}
      />
    );
  }

  const viewer = await getEpisodeViewer(show, seasonNumber, episodeNumber);

  if (viewer.status !== "ok") {
    return (
      <ViewerFrame backHref={viewer.detailsHref} backLabel={`Back to ${show.title}`}>
        <ViewerScreen backdrop={<ViewerBackdrop image={showBackdrop} />}>
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
            {viewer.status === "unaired"
              ? "This episode hasn't aired yet"
              : "This episode isn't available"}
          </h1>
          <p className="mt-2 text-sm text-foreground/80 sm:text-base">
            {viewer.status === "unaired"
              ? `${show.title} season ${seasonNumber}, episode ${episodeNumber} airs on ${formatCalendarDate(viewer.airDate)}.`
              : `TMDB doesn't list season ${seasonNumber}, episode ${episodeNumber} of ${show.title}.`}
          </p>
          <ButtonLink href={viewer.detailsHref} variant="secondary" className="mt-6 bg-background/40">
            Browse episodes
          </ButtonLink>
        </ViewerScreen>
      </ViewerFrame>
    );
  }

  const { content } = viewer;
  return (
    <ViewerFrame backHref={content.detailsHref} backLabel={content.detailsLabel}>
      <SimulatedPlayer key={content.key} content={content} autoplay={autoplay === "1"} />
    </ViewerFrame>
  );
}
