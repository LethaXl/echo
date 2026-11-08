import styles from "./TitleHero.module.css";
import ButtonLink from "@/components/ButtonLink";
import TitleWatchlist from "@/components/watchlist/TitleWatchlist";
import TitleViewingStatus from "@/components/viewing-status/TitleViewingStatus";
import TitleRating from "@/components/ratings/TitleRating";
import { FilmIcon, PlayIcon, StarIcon } from "@/components/icons";
import EchoPlusAccess from "@/components/details/EchoPlusAccess";
import TmdbImage from "@/components/details/TmdbImage";
import CastList from "@/components/details/CastList";
import { MEDIA_TYPES } from "@/components/media/media-types";
import { formatCount } from "@/lib/format";
import { getWatchlistAccess } from "@/lib/watchlist/access";
import type { MovieDetails, TvShowDetails } from "@/types/media";

export type TitleFact = { label: string; value: string };

type TitleHeroProps = {
  title: MovieDetails | TvShowDetails;
  /** Short facts shown under the title, e.g. year, runtime, genres. */
  meta: string[];
  facts: TitleFact[];
  /** Whether the viewer has an active Echo+ subscription. */
  hasEchoPlus: boolean;
  /** The simulated viewer; it checks subscription access itself. */
  watchHref: string;
};

export default async function TitleHero({ title, meta, facts, hasEchoPlus, watchHref }: TitleHeroProps) {
  const mediaType = MEDIA_TYPES[title.mediaType];
  const access = await getWatchlistAccess();
  const isGuest = access.status === "guest";

  return (
    <div className="grid items-start gap-10 max-md:grid-cols-[clamp(6rem,26vw,7rem)_minmax(0,1fr)] max-md:gap-x-4 max-md:gap-y-5 md:grid-cols-[14rem_minmax(0,1fr)] md:gap-12 lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-13 xl:grid-cols-[17rem_minmax(0,1fr)] xl:gap-14">
      <TmdbImage
        path={title.posterPath}
        size="w500"
        sizes="(max-width: 767px) 112px, 17rem"
        preload
        className="aspect-[2/3] w-full max-w-[14rem] max-md:col-start-1 max-md:row-start-1 max-md:max-w-none ring-1 ring-line md:max-w-none"
        fallback={<FilmIcon className="size-10" />}
      />

      <div className="max-w-[52rem] min-w-0 max-md:contents">
        <div className="contents max-md:col-start-2 max-md:row-start-1 max-md:block max-md:min-w-0">
        <p className="flex items-center gap-1.5 text-xs leading-none font-semibold tracking-[0.08em] text-accent uppercase">
          <mediaType.Icon className="size-3.5" />
          {mediaType.label}
        </p>
        <h1 className="mt-3 text-[3rem] leading-[1.05] max-md:mt-2 max-md:text-[clamp(1.375rem,6vw,1.75rem)] max-md:leading-[1.12] max-md:break-words font-bold tracking-tight text-balance">
          {title.title}
        </h1>

        <div className="mt-4 flex flex-wrap items-center gap-x-2.5 gap-y-2 text-[0.9375rem] max-md:mt-3 max-md:gap-x-3 max-md:gap-y-1.5 max-md:text-[13px] max-md:leading-5 text-muted">
          {title.certification && (
            <span className="rounded-sm border border-muted/40 px-1.5 py-0.5 text-xs leading-none font-medium text-foreground/90">
              <span className="sr-only">Rated </span>
              {title.certification}
            </span>
          )}
          {meta.map((item, index) => (
            <span key={item} className="flex items-center gap-2.5 max-md:max-w-full max-md:break-words">
              {(index > 0 || title.certification) && (
                <span aria-hidden="true" className="text-muted/50 max-md:hidden">
                  ·
                </span>
              )}
              {item}
            </span>
          ))}
        </div>

        {title.tmdbRating !== null && (
          <p className="mt-3 flex items-baseline gap-2 max-md:mt-2 max-md:flex-wrap max-md:gap-y-1">
            <span className="flex items-center gap-1.5 self-center">
              <StarIcon className="size-[1.125rem] text-accent" />
              <span className="text-lg leading-none font-semibold text-foreground tabular-nums">
                {title.tmdbRating.toFixed(1)}
              </span>
            </span>
            <span className="text-sm text-muted max-md:text-xs">
              / 10 on TMDB · {formatCount(title.tmdbVoteCount)}{" "}
              {title.tmdbVoteCount === 1 ? "vote" : "votes"}
            </span>
          </p>
        )}

        </div>

        <div className="contents max-md:col-span-2 max-md:block max-md:min-w-0 max-md:[&>div:first-child]:mt-0">
        <div className={`mt-6 flex flex-wrap items-center gap-3 ${styles.actions}`}>
          {/* US-32 Open the Simulated Viewer */}
          {!isGuest && (
            <ButtonLink href={watchHref} size="lg" className={styles.primary}>
              <PlayIcon className="size-4" />
              Watch now
            </ButtonLink>
          )}
          <div className="contents" data-title-action="watchlist"><TitleWatchlist item={title} /></div>
          <div className="contents" data-title-action="viewing"><TitleViewingStatus item={title} /></div>
          <div className="contents" data-title-action={hasEchoPlus ? "rating" : "access"}>
            {hasEchoPlus ? <TitleRating item={title} /> : <EchoPlusAccess hasEchoPlus={false} />}
          </div>
        </div>

        {!isGuest && !hasEchoPlus && (
          <div className="mt-6 max-md:mt-3">
            <TitleRating item={title} />
          </div>
        )}

        <div className="mt-8 max-md:mt-5">
          {title.tagline && (
            <p className="mb-3 text-xl max-md:mb-2 max-md:text-base text-foreground/65 italic">{title.tagline}</p>
          )}
          <p className="text-[1.0625rem] leading-[1.6] max-md:text-[15px] max-md:leading-relaxed font-normal text-foreground/80">
            {title.overview ?? "No overview is available for this title yet."}
          </p>
        </div>

        {title.cast.length > 0 && (
          <div className="mt-6 md:hidden">
            <CastList cast={title.cast} headingId="mobile-cast-heading" />
          </div>
        )}

        {facts.length > 0 && (
          <dl className="mt-9 grid max-w-[52rem] grid-cols-[repeat(2,minmax(0,13rem))] gap-x-12 gap-y-6 border-t border-line pt-7 max-md:mt-6 max-md:grid-cols-1 max-md:gap-y-3 max-md:pt-4 lg:grid-cols-[repeat(3,minmax(0,13rem))]">
            {facts.map((fact) => (
              <div key={fact.label} className="min-w-0 max-md:grid max-md:grid-cols-[6.5rem_minmax(0,1fr)] max-md:items-baseline max-md:gap-x-3">
                <dt className="text-[0.8125rem] text-muted">{fact.label}</dt>
                <dd className="mt-1.5 text-[0.9375rem] max-md:mt-0 max-md:text-sm max-md:break-words font-medium text-foreground">{fact.value}</dd>
              </div>
            ))}
          </dl>
        )}
        </div>
      </div>
    </div>
  );
}
