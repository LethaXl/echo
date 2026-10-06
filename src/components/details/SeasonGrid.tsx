import Link from "next/link";
import { FilmIcon } from "@/components/icons";
import TmdbImage from "@/components/details/TmdbImage";
import { formatEpisodeCount } from "@/lib/format";
import { seasonHref } from "@/lib/media-routes";
import type { TvShowDetails } from "@/types/media";

// US-11 View Show Seasons
export default function SeasonGrid({ show }: { show: TvShowDetails }) {
  return (
    <section aria-labelledby="seasons-heading">
      <h2
        id="seasons-heading"
        className="mb-5 flex items-baseline gap-2 text-xl font-semibold tracking-tight"
      >
        Seasons
        {show.seasons.length > 0 && (
          <span className="text-sm font-normal text-muted tabular-nums">{show.seasons.length}</span>
        )}
      </h2>

      {show.seasons.length > 0 ? (
        <ul className="grid grid-cols-[repeat(auto-fill,9.5rem)] gap-x-6 gap-y-8">
          {show.seasons.map((season) => (
            <li key={season.seasonNumber}>
              <Link
                href={seasonHref(show.tmdbId, season.seasonNumber)}
                className="group block rounded-md"
              >
                <TmdbImage
                  path={season.posterPath ?? show.posterPath}
                  size="w342"
                  sizes="9.5rem"
                  className="aspect-[2/3] ring-1 ring-line transition duration-200 ease-out group-hover:scale-[1.02] group-hover:brightness-110"
                  fallback={<FilmIcon className="size-6" />}
                />
                <h3 className="mt-3 truncate text-sm font-semibold transition-colors duration-150 group-hover:text-accent">
                  {season.name}
                </h3>
                <p className="mt-1 text-xs text-muted">{formatEpisodeCount(season.episodeCount)}</p>
                {season.year && (
                  <p className="mt-0.5 text-xs text-muted tabular-nums">{season.year}</p>
                )}
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-md border border-line bg-surface px-4 py-6 text-sm text-muted">
          No seasons are listed for this show yet.
        </p>
      )}
    </section>
  );
}
