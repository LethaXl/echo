import { EchoWaveIcon } from "@/components/icons";
import MediaCard from "@/components/media/MediaCard";
import NewEchoLink from "@/components/media/NewEchoLink";
import scrollStyles from "./MobileScroll.module.css";
import type { CatalogueItem } from "@/types/media";

type EchoTrailProps = {
  start: CatalogueItem | null;
  /** Titles after the start, each related to the one before it. */
  related: CatalogueItem[];
  nextHref: string | null;
};

const HEADING_ID = "start-an-echo-heading";

export default function EchoTrail({ start, related, nextHref }: EchoTrailProps) {
  const trail = start ? [start, ...related] : [];

  return (
    <section aria-labelledby={HEADING_ID} className="border-y border-line py-10 max-md:py-6">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-x-6 gap-y-3 max-md:grid max-md:grid-cols-[minmax(0,1fr)_auto] max-md:items-center max-md:gap-x-2 max-md:gap-y-1">
        <div className="max-md:contents">
          <h2
            id={HEADING_ID}
            className="max-md:col-start-1 max-md:row-start-1 max-md:text-lg flex items-center gap-2 text-xl font-semibold tracking-tight"
          >
            Start an Echo
            <EchoWaveIcon className="size-4 text-accent" />
          </h2>
          <p className="mt-1 text-sm text-muted max-md:col-span-2 max-md:row-start-2 max-md:mt-0">Follow one title into the next.</p>
        </div>
        {start && nextHref && <NewEchoLink href={nextHref} />}
      </div>

      {start ? (
        <ol
          aria-label={`Echo Trail starting from ${start.title}`}
          className={`${scrollStyles.scroller} -mx-1 -my-2 flex overflow-x-auto max-md:overscroll-x-contain px-1 py-2 [scrollbar-width:thin]`}
        >
          {trail.map((item, index) => (
            <li key={`${item.mediaType}-${item.tmdbId}`} className="flex shrink-0">
              {index > 0 && (
                <div
                  aria-hidden="true"
                  className="flex w-20 max-md:w-5 shrink-0 items-center justify-center pb-[3.125rem]"
                >
                  <EchoWaveIcon className="size-6 max-md:size-4 text-accent/80" />
                </div>
              )}
              <div className="w-[clamp(9rem,13vw,13.5rem)] max-md:w-[clamp(6rem,30vw,8rem)]">
                <MediaCard item={item} tag={index === 0 ? "Start" : undefined} />
              </div>
            </li>
          ))}
          {related.length === 0 && (
            <li className="flex max-w-xs items-center pb-[3.125rem] pl-8 text-sm text-muted">
              Related titles aren&apos;t available for this one right now.
            </li>
          )}
        </ol>
      ) : (
        <p className="rounded-md border border-line bg-surface px-4 py-6 text-sm text-muted">
          Echo Trails couldn&apos;t be loaded right now. Please try again later.
        </p>
      )}
    </section>
  );
}
