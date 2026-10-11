import type { Metadata } from "next";
import { notFound } from "next/navigation";
import SimulatedPlayer from "@/components/viewer/SimulatedPlayer";
import ViewerFrame from "@/components/viewer/ViewerFrame";
import WatchUpgradePrompt from "@/components/viewer/WatchUpgradePrompt";
import { parseRouteNumber, watchMovieHref } from "@/lib/media-routes";
import { hasEchoPlus } from "@/lib/subscriptions/queries";
import { getMovieDetails } from "@/lib/tmdb/details";
import { movieViewerContent, requireSignedIn } from "@/lib/viewer/queries";

type WatchMoviePageProps = PageProps<"/watch/movie/[id]">;

async function loadMovie(params: WatchMoviePageProps["params"]) {
  const movieId = parseRouteNumber((await params).id);
  const movie = movieId === null ? null : await getMovieDetails(movieId);
  if (!movie) notFound();
  return movie;
}

export async function generateMetadata({ params }: WatchMoviePageProps): Promise<Metadata> {
  const movie = await loadMovie(params);
  return { title: `Watch ${movie.title}` };
}

// US-32 Open the Simulated Viewer (movies)
export default async function WatchMoviePage({ params, searchParams }: WatchMoviePageProps) {
  const movieId = parseRouteNumber((await params).id);
  if (movieId === null) notFound();
  // Checked here on every request, so typing or refreshing the URL can't skip it.
  await requireSignedIn(watchMovieHref(movieId));

  const [movie, echoPlus, { autoplay }] = await Promise.all([
    loadMovie(params),
    hasEchoPlus(),
    searchParams,
  ]);
  const content = movieViewerContent(movie);

  if (!echoPlus) {
    return (
      <WatchUpgradePrompt
        title={movie.title}
        backdrop={content.backdrop}
        backHref={content.detailsHref}
        backLabel={content.detailsLabel}
      />
    );
  }

  return (
    <ViewerFrame backHref={content.detailsHref} backLabel={content.detailsLabel}>
      <SimulatedPlayer key={content.key} content={content} autoplay={autoplay === "1"} />
    </ViewerFrame>
  );
}
