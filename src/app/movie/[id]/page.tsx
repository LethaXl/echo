import type { Metadata } from "next";
import { notFound } from "next/navigation";
import CastList from "@/components/details/CastList";
import BrowseBackLink from "@/components/details/BrowseBackLink";
import TitleHero, { type TitleFact } from "@/components/details/TitleHero";
import { formatCalendarDate, formatLanguage, formatRuntime } from "@/lib/format";
import { parseRouteNumber } from "@/lib/media-routes";
import { getCurrentSubscription } from "@/lib/subscriptions/queries";
import { getMovieDetails } from "@/lib/tmdb/details";
import type { MovieDetails } from "@/types/media";

async function loadMovie(params: PageProps<"/movie/[id]">["params"]): Promise<MovieDetails> {
  const movieId = parseRouteNumber((await params).id);
  const movie = movieId === null ? null : await getMovieDetails(movieId);
  if (!movie) notFound();
  return movie;
}

export async function generateMetadata({ params }: PageProps<"/movie/[id]">): Promise<Metadata> {
  const movie = await loadMovie(params);
  return {
    title: movie.year ? `${movie.title} (${movie.year})` : movie.title,
    description: movie.overview ?? undefined,
  };
}

function movieFacts(movie: MovieDetails): TitleFact[] {
  const facts: TitleFact[] = [];
  if (movie.directors.length > 0) {
    facts.push({
      label: movie.directors.length > 1 ? "Directors" : "Director",
      value: movie.directors.join(", "),
    });
  }
  if (movie.releaseDate) {
    facts.push({ label: "Release date", value: formatCalendarDate(movie.releaseDate) });
  }
  if (movie.status) facts.push({ label: "Status", value: movie.status });
  if (movie.originalLanguage) {
    facts.push({ label: "Original language", value: formatLanguage(movie.originalLanguage) });
  }
  return facts;
}

// US-10 View Content Details (movies)
export default async function MoviePage({ params }: PageProps<"/movie/[id]">) {
  const [movie, subscription] = await Promise.all([loadMovie(params), getCurrentSubscription()]);
  const meta = [
    movie.year?.toString(),
    movie.runtime ? formatRuntime(movie.runtime) : undefined,
    movie.genres.join(", ") || undefined,
  ].filter((item): item is string => Boolean(item));

  return (
    <div data-layout="wide" className="pt-2 pb-10 motion-safe:animate-fade-in-up">
      <BrowseBackLink label="Back to Browse" />
      <div className="mt-6">
        <TitleHero
          title={movie}
          meta={meta}
          facts={movieFacts(movie)}
          hasEchoPlus={subscription !== null}
        />
      </div>
      <div className="mt-18">
        <CastList cast={movie.cast} />
      </div>
    </div>
  );
}
