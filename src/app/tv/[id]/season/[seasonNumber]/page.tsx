import type { Metadata } from "next";
import { notFound } from "next/navigation";
import DetailsBackLink from "@/components/details/DetailsBackLink";
import EpisodeList from "@/components/details/EpisodeList";
import SeasonPicker from "@/components/details/SeasonPicker";
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
  const overview = season.overview ?? show.overview;

  return (
    <div data-layout="wide" className="pt-2 pb-10 motion-safe:animate-fade-in-up max-md:[&>a:first-child]:min-h-11 max-md:[&>a:first-child]:max-w-full max-md:[&>a:first-child]:py-2 max-md:[&>a:first-child>svg]:shrink-0">
      <DetailsBackLink href={titleHref(show)} label={`Back to ${show.title}`} />

      <header className="mt-8 grid grid-cols-[9rem_minmax(0,1fr)] items-start gap-10 max-md:mt-4 max-md:grid-cols-[6rem_minmax(0,1fr)] max-md:grid-rows-[auto_auto_1fr] max-md:gap-x-4 max-md:gap-y-2 xl:grid-cols-[10.5rem_minmax(0,1fr)] xl:gap-12">
        <TmdbImage
          path={season.posterPath ?? show.posterPath}
          size="w342"
          sizes="(max-width: 767px) 96px, 10.5rem"
          preload
          className="aspect-[2/3] max-md:row-span-3 ring-1 ring-line"
          fallback={<FilmIcon className="size-8" />}
        />
        <div className="max-w-[52rem] min-w-0 max-md:contents">
          <p className="flex items-center gap-1.5 text-xs leading-none font-semibold tracking-[0.08em] text-accent uppercase max-md:col-start-2 max-md:row-start-1 max-md:text-[11px] max-md:leading-4 max-md:break-words max-md:[&>svg]:shrink-0">
            <TvIcon className="size-3.5" />
            {show.title}
          </p>
          <h1 className="mt-3 text-[2.5rem] leading-[1.05] max-md:col-start-2 max-md:row-start-2 max-md:mt-0 max-md:text-[1.75rem] max-md:leading-tight max-md:break-words font-bold tracking-tight">
            {season.name}
          </h1>
          <p className="mt-3 text-[0.9375rem] text-muted max-md:col-start-2 max-md:row-start-3 max-md:mt-0 max-md:text-xs">{meta.join(" · ")}</p>
          {overview && (
            <p className="mt-5 text-lg leading-[1.6] max-md:col-span-2 max-md:mt-2 max-md:text-sm max-md:leading-relaxed text-foreground/90">{overview}</p>
          )}
        </div>
      </header>

      <div className="mt-10 max-md:mt-6">
        <EpisodeList
          showId={show.tmdbId}
          seasonNumber={season.seasonNumber}
          episodes={season.episodes}
          navigation={show.seasons.length > 1 ? (
            <SeasonPicker
              showId={show.tmdbId}
              seasons={show.seasons}
              currentSeasonNumber={season.seasonNumber}
            />
          ) : undefined}
        />
      </div>
    </div>
  );
}
