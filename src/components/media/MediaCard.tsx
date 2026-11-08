import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { FilmIcon, StarIcon } from "@/components/icons";
import { MEDIA_TYPES } from "@/components/media/media-types";
import { titleHref } from "@/lib/media-routes";
import { getTmdbImageUrl } from "@/lib/tmdb/images";
import type { CatalogueItem } from "@/types/media";

const POSTER_SIZES =
  "(max-width: 767px) calc((100vw - 44px) / 2), (min-width: 96rem) 220px, (min-width: 80rem) 17vw, (min-width: 64rem) 20vw, 26vw";

type MediaCardProps = {
  item: CatalogueItem;
  /** Shown above the poster in ranked rows such as Trending Now. */
  rank?: number;
  /** A short label pinned to the poster, e.g. the start of an Echo Trail. */
  tag?: string;
  showMediaType?: boolean;
  /** Spells out the media type and always shows the TMDB rating, for mixed result grids. */
  detailedMeta?: boolean;
  /** An independent action beside the title, outside the detail-page link. */
  titleAction?: ReactNode;
  /** Hide TMDB's rating only where a personal Echo rating is the focus. */
  showTmdbRating?: boolean;
  /** Mobile Cave cards omit TMDB scores while retaining the desktop presentation. */
  showMobileTmdbRating?: boolean;
};

export default function MediaCard({
  item,
  rank,
  tag,
  showMediaType = true,
  detailedMeta = false,
  titleAction,
  showTmdbRating = true,
  showMobileTmdbRating = true,
}: MediaCardProps) {
  const posterUrl = getTmdbImageUrl(item.posterPath, "w342");
  const mediaType = MEDIA_TYPES[item.mediaType];

  const poster = (
    <>
      {rank !== undefined && (
        <div className="mb-2 flex h-[1.125rem] items-center gap-2.5">
          <span className="text-lg leading-none font-semibold tracking-tight text-foreground tabular-nums">
            {String(rank).padStart(2, "0")}
          </span>
          <span
            aria-hidden="true"
            className="h-px flex-1 bg-line transition-colors duration-200 group-hover:bg-accent/50"
          />
        </div>
      )}
      <div
        className={`relative aspect-[2/3] overflow-hidden rounded-md bg-elevated transition duration-200 ease-out group-hover:scale-[1.02] group-hover:brightness-110 ${
          tag ? "ring-1 ring-accent/50" : ""
        }`}
      >
        {posterUrl ? (
          <Image src={posterUrl} alt="" fill sizes={POSTER_SIZES} className="object-cover" />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-2 border border-line px-3 text-center text-muted">
            <FilmIcon className="size-6 text-muted/60" />
            <span className="text-xs">No poster available</span>
          </div>
        )}
        {tag && (
          <span className="absolute top-2 left-2 rounded-sm bg-background/80 px-1.5 py-0.5 text-[10px] leading-none font-semibold tracking-[0.12em] text-accent uppercase">
            {tag}
          </span>
        )}
        {showTmdbRating && item.tmdbRating !== null && !detailedMeta && (
          <div
            aria-hidden="true"
            className="absolute inset-x-0 bottom-0 max-md:hidden flex translate-y-full items-center justify-end gap-1 bg-background/85 px-2.5 py-1.5 text-[11px] font-medium text-foreground opacity-0 transition duration-200 ease-out group-hover:translate-y-0 group-hover:opacity-100"
          >
            <StarIcon className="size-3 text-accent" />
            {item.tmdbRating.toFixed(1)}
            <span className="text-muted">TMDB</span>
          </div>
        )}
      </div>
    </>
  );

  const heading = (
      <h3 className={`truncate max-md:leading-5 text-sm font-medium text-foreground ${titleAction ? "leading-7" : "mt-2.5"}`} title={item.title}>
        {item.title}
      </h3>
  );

  const metadata = detailedMeta ? (
        <p className="mt-1 flex h-4 max-md:h-auto max-md:min-h-4 max-md:gap-x-1.5 max-md:text-[11px] items-center gap-1.5 text-xs text-muted">
          {item.year !== null && (
            <>
              <span className="tabular-nums">{item.year}</span>
              <span aria-hidden="true" className="text-muted/50">
                ·
              </span>
            </>
          )}
          <span>{mediaType.label}</span>
          {showTmdbRating && item.tmdbRating !== null && (
            <span className={`ml-auto flex items-center gap-1 text-foreground/80 tabular-nums max-md:mr-2 max-md:gap-0.5 max-md:shrink-0 ${showMobileTmdbRating ? "" : "max-md:hidden"}`}>
              <StarIcon className="size-3 text-accent" />
              {item.tmdbRating.toFixed(1)}
              <span className="sr-only">TMDB rating</span>
            </span>
          )}
        </p>
      ) : (
        <p className="mt-1 flex h-4 max-md:h-auto max-md:min-h-4 max-md:gap-x-1.5 max-md:text-[11px] items-center gap-2 text-xs text-muted">
          {item.year !== null && <span className="tabular-nums">{item.year}</span>}
          {showMediaType && (
            <span title={mediaType.label} className="flex">
              <mediaType.Icon className="size-3.5" />
              <span className="sr-only">{mediaType.label}</span>
            </span>
          )}
          {showTmdbRating && item.tmdbRating !== null && (
            <>
              <span className={`sr-only ${showMobileTmdbRating ? "" : "max-md:hidden"}`}>, TMDB rating {item.tmdbRating.toFixed(1)}</span>
              <span aria-hidden="true" className={`hidden items-center gap-1 text-foreground/80 tabular-nums max-md:mr-2 max-md:ml-auto max-md:shrink-0 max-md:gap-0.5 ${showMobileTmdbRating ? "max-md:inline-flex" : ""}`}>
                <StarIcon className="size-3 text-accent" />{item.tmdbRating.toFixed(1)}
              </span>
            </>
          )}
        </p>
      );

  if (titleAction) {
    return (
      <div>
        <Link href={titleHref(item)} aria-label={`View ${item.title}`} className="group relative block rounded-md">{poster}</Link>
        <div className="mt-2 flex items-center gap-2 max-md:mt-2.5 max-md:items-start">
          <div className="min-w-0 flex-1">
            <Link href={titleHref(item)} className="block rounded-sm">{heading}</Link>
            {metadata}
          </div>
          <div className="shrink-0">{titleAction}</div>
        </div>
      </div>
    );
  }

  return (
    <Link href={titleHref(item)} className="group relative block rounded-md">
      {poster}
      {heading}
      {metadata}
    </Link>
  );
}
