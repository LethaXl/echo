import type { Metadata } from "next";
import { notFound } from "next/navigation";
import DetailsBackLink from "@/components/details/DetailsBackLink";
import EpisodeList from "@/components/details/EpisodeList";
import SeasonNav from "@/components/details/SeasonNav";
import TmdbImage from "@/components/details/TmdbImage";
import { FilmIcon, TvIcon } from "@/components/icons";
import { formatEpisodeCount } from "@/lib/format";
import { parseRouteNumber, titleHref } from "@/lib/media-routes";
import { getSeasonDetails, getTvShowDetails } from "@/lib/tmdb/details";

type SeasonPageProps = PageProps<"/tv/[id]/season/[seasonNumber]">;

async function loadSeason(params: SeasonPageProps["params"]) {
  const { id, seasonNumber } = await params;
  const showId = parseRouteNumber(id);
  const number = parseRouteNumber(seasonNumber);
  if (showId === null || number === null) notFound();

  const [show, season] = await Promise.all([
    getTvShowDetails(showId),
    getSeasonDetails(showId, number),
  ]);
  if (!show || !season) notFound();
  return { show, season };
}

export async function generateMetadata({ params }: SeasonPageProps): Promise<Metadata> {
  const { show, season } = await loadSeason(params);
  return {
    title: `${season.name} · ${show.title}`,
    description: season.overview ?? show.overview ?? undefined,
  };
}

// US-12 View Season Episodes
export default async function SeasonPage({ params }: SeasonPageProps) {
  const { show, season } = await loadSeason(params);
  const meta = [season.year, formatEpisodeCount(season.episodes.length)].filter(Boolean);

  return (
    <div data-layout="wide" className="pt-2 pb-10 motion-safe:animate-fade-in-up">
      <DetailsBackLink href={titleHref(show)} label={`Back to ${show.title}`} />

      <header className="mt-8 grid grid-cols-[9rem_minmax(0,1fr)] items-start gap-10 xl:grid-cols-[10.5rem_minmax(0,1fr)] xl:gap-12">
        <TmdbImage
          path={season.posterPath ?? show.posterPath}
          size="w342"
          sizes="10.5rem"
          preload
          className="aspect-[2/3] ring-1 ring-line"
          fallback={<FilmIcon className="size-8" />}
        />
        <div className="max-w-[52rem] min-w-0">
          <p className="flex items-center gap-1.5 text-xs leading-none font-semibold tracking-[0.08em] text-accent uppercase">
            <TvIcon className="size-3.5" />
            {show.title}
          </p>
          <h1 className="mt-3 text-[2.5rem] leading-[1.05] font-bold tracking-tight">
            {season.name}
          </h1>
          <p className="mt-3 text-[0.9375rem] text-muted">{meta.join(" · ")}</p>
          {season.overview && (
            <p className="mt-5 text-lg leading-[1.6] text-foreground/90">{season.overview}</p>
          )}
        </div>
      </header>

      <div className="mt-10">
        <SeasonNav
          showId={show.tmdbId}
          seasons={show.seasons}
          currentSeasonNumber={season.seasonNumber}
        />
      </div>
      <div className="mt-12">
        <EpisodeList episodes={season.episodes} />
      </div>
    </div>
  );
}
