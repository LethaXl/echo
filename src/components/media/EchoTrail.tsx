import { EchoWaveIcon } from "@/components/icons";
import MediaCard from "@/components/media/MediaCard";
import NewEchoLink from "@/components/media/NewEchoLink";
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
    <section aria-labelledby={HEADING_ID} className="border-y border-line py-10">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <div>
          <h2
            id={HEADING_ID}
            className="flex items-center gap-2 text-xl font-semibold tracking-tight"
          >
            Start an Echo
            <EchoWaveIcon className="size-4 text-accent" />
          </h2>
          <p className="mt-1 text-sm text-muted">Follow one title into the next.</p>
        </div>
        {start && nextHref && <NewEchoLink href={nextHref} />}
      </div>

      {start ? (
        <ol
          aria-label={`Echo Trail starting from ${start.title}`}
          className="-mx-1 -my-2 flex overflow-x-auto px-1 py-2 [scrollbar-width:thin]"
        >
          {trail.map((item, index) => (
            <li key={`${item.mediaType}-${item.tmdbId}`} className="flex shrink-0">
              {index > 0 && (
                <div
                  aria-hidden="true"
                  className="flex w-20 shrink-0 items-center justify-center pb-[3.125rem]"
                >
                  <EchoWaveIcon className="size-6 text-accent/80" />
                </div>
              )}
              <div className="w-[clamp(9rem,13vw,13.5rem)]">
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
