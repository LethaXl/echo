import ButtonLink from "@/components/ButtonLink";
import { FilmIcon, PlayIcon, StarIcon } from "@/components/icons";
import EchoPlusAccess from "@/components/details/EchoPlusAccess";
import TmdbImage from "@/components/details/TmdbImage";
import { MEDIA_TYPES } from "@/components/media/media-types";
import { formatCount } from "@/lib/format";
import type { MovieDetails, TvShowDetails } from "@/types/media";

export type TitleFact = { label: string; value: string };

type TitleHeroProps = {
  title: MovieDetails | TvShowDetails;
  /** Short facts shown under the title, e.g. year, runtime, genres. */
  meta: string[];
  facts: TitleFact[];
  /** Whether the viewer has an active Echo+ subscription. */
  hasEchoPlus: boolean;
  /** The simulated viewer; it checks access itself, so everyone gets the button. */
  watchHref: string;
};

export default function TitleHero({ title, meta, facts, hasEchoPlus, watchHref }: TitleHeroProps) {
  const mediaType = MEDIA_TYPES[title.mediaType];

  return (
    <div className="grid items-start gap-10 md:grid-cols-[14rem_minmax(0,1fr)] md:gap-12 lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-13 xl:grid-cols-[17rem_minmax(0,1fr)] xl:gap-14">
      <TmdbImage
        path={title.posterPath}
        size="w500"
        sizes="17rem"
        preload
        className="aspect-[2/3] w-full max-w-[14rem] ring-1 ring-line md:max-w-none"
        fallback={<FilmIcon className="size-10" />}
      />

      <div className="max-w-[52rem] min-w-0">
        <p className="flex items-center gap-1.5 text-xs leading-none font-semibold tracking-[0.08em] text-accent uppercase">
          <mediaType.Icon className="size-3.5" />
          {mediaType.label}
        </p>
        <h1 className="mt-3 text-[3rem] leading-[1.05] font-bold tracking-tight text-balance">
          {title.title}
        </h1>

        <div className="mt-4 flex flex-wrap items-center gap-x-2.5 gap-y-2 text-[0.9375rem] text-muted">
          {title.certification && (
            <span className="rounded-sm border border-muted/40 px-1.5 py-0.5 text-xs leading-none font-medium text-foreground/90">
              <span className="sr-only">Rated </span>
              {title.certification}
            </span>
          )}
          {meta.map((item, index) => (
            <span key={item} className="flex items-center gap-2.5">
              {(index > 0 || title.certification) && (
                <span aria-hidden="true" className="text-muted/50">
                  ·
                </span>
              )}
              {item}
            </span>
          ))}
        </div>

        {title.tmdbRating !== null && (
          <p className="mt-3 flex items-baseline gap-2">
            <span className="flex items-center gap-1.5 self-center">
              <StarIcon className="size-[1.125rem] text-accent" />
              <span className="text-lg leading-none font-semibold text-foreground tabular-nums">
                {title.tmdbRating.toFixed(1)}
              </span>
            </span>
            <span className="text-sm text-muted">
              / 10 on TMDB · {formatCount(title.tmdbVoteCount)}{" "}
              {title.tmdbVoteCount === 1 ? "vote" : "votes"}
            </span>
          </p>
        )}

        <div className="mt-6 flex flex-wrap items-center gap-3">
          {/* US-32 Open the Simulated Viewer */}
          <ButtonLink href={watchHref} size="lg">
            <PlayIcon className="size-4" />
            Watch now
          </ButtonLink>
          <EchoPlusAccess hasEchoPlus={hasEchoPlus} />
        </div>

        <div className="mt-8">
          {title.tagline && (
            <p className="mb-3 text-xl text-foreground/65 italic">{title.tagline}</p>
          )}
          <p className="text-[1.0625rem] leading-[1.6] font-normal text-foreground/80">
            {title.overview ?? "No overview is available for this title yet."}
          </p>
        </div>

        {facts.length > 0 && (
          <dl className="mt-9 grid max-w-[52rem] grid-cols-[repeat(2,minmax(0,13rem))] gap-x-12 gap-y-6 border-t border-line pt-7 lg:grid-cols-[repeat(3,minmax(0,13rem))]">
            {facts.map((fact) => (
              <div key={fact.label} className="min-w-0">
                <dt className="text-[0.8125rem] text-muted">{fact.label}</dt>
                <dd className="mt-1.5 text-[0.9375rem] font-medium text-foreground">{fact.value}</dd>
              </div>
            ))}
          </dl>
        )}
      </div>
    </div>
  );
}
