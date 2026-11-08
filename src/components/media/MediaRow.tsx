"use client";

import { useEffect, useId, useRef, useState } from "react";
import { ChevronDownIcon, EchoWaveIcon } from "@/components/icons";
import MediaCard from "@/components/media/MediaCard";
import scrollStyles from "./MobileScroll.module.css";
import type { CatalogueItem } from "@/types/media";

type MediaRowProps = {
  title: string;
  /** Adds the small Echo wave mark beside the heading. */
  echoMark?: boolean;
  items: CatalogueItem[] | null;
  /** Numbers each card in the order the items were returned. */
  ranked?: boolean;
  /** Turn off when the row's title already says whether it's movies or TV. */
  showMediaType?: boolean;
};

// --cols is how many cards fit across the row.
const COLUMNS_CLASS_NAME = "[--cols:4] max-md:[--cols:2.5] lg:[--cols:5] xl:[--cols:6] 2xl:[--cols:7]";

export default function MediaRow({
  title,
  echoMark = false,
  items,
  ranked = false,
  showMediaType = true,
}: MediaRowProps) {
  const headingId = useId();
  const scrollerRef = useRef<HTMLUListElement>(null);
  const [canScroll, setCanScroll] = useState({ back: false, forward: false });

  function updateScrollState() {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    const back = scroller.scrollLeft > 4;
    const forward = scroller.scrollLeft + scroller.clientWidth < scroller.scrollWidth - 4;
    setCanScroll((current) =>
      current.back === back && current.forward === forward ? current : { back, forward },
    );
  }

  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    const observer = new ResizeObserver(updateScrollState);
    observer.observe(scroller);
    return () => observer.disconnect();
  }, []);

  function scrollByPage(direction: 1 | -1) {
    const scroller = scrollerRef.current;
    const firstCard = scroller?.firstElementChild;
    if (!scroller || !(firstCard instanceof HTMLElement)) return;

    // Move by whole cards so each page lands exactly on a snap point.
    const gap = Number.parseFloat(getComputedStyle(scroller).columnGap) || 0;
    const step = firstCard.offsetWidth + gap;
    const cardsPerPage = Math.max(1, Math.floor((scroller.clientWidth + gap) / step));
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    scroller.scrollBy({
      left: direction * cardsPerPage * step,
      behavior: reduceMotion ? "auto" : "smooth",
    });
  }

  const arrowClassName =
    "flex h-14 w-8 items-center justify-center rounded-md border border-line bg-elevated text-muted transition-colors duration-150 hover:border-accent/50 hover:text-accent focus-visible:border-accent/50 focus-visible:text-accent";
  // Spans the posters only: below the rank line (if any) and above the title block.
  const arrowTrackClassName = `absolute bottom-[3.125rem] max-md:hidden flex items-center ${
    ranked ? "top-[1.625rem]" : "top-0"
  }`;

  return (
    <section aria-labelledby={headingId}>
      <h2 id={headingId} className="mb-4 flex items-center gap-2 text-xl font-semibold tracking-tight">
        {title}
        {echoMark && <EchoWaveIcon className="size-4 text-accent" />}
      </h2>

      {items && items.length > 0 ? (
        <div className="group/row relative">
          <ul
            ref={scrollerRef}
            tabIndex={0}
            aria-label={`${title} titles`}
            onScroll={updateScrollState}
            className={`${scrollStyles.scroller} -mx-1 -my-2 flex snap-x snap-mandatory scroll-px-1 gap-5 max-md:gap-2 max-md:overscroll-x-contain overflow-x-auto px-1 py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${COLUMNS_CLASS_NAME}`}
          >
            {items.map((item, index) => (
              <li
                key={`${item.mediaType}-${item.tmdbId}`}
                className="w-[calc((100%-(var(--cols)-1)*1.25rem)/var(--cols))] shrink-0 snap-start max-md:w-[calc((100%-1rem)/2.5)]"
              >
                <MediaCard
                  item={item}
                  rank={ranked ? index + 1 : undefined}
                  showMediaType={showMediaType}
                />
              </li>
            ))}
          </ul>

          {canScroll.back && (
            <div className={`${arrowTrackClassName} left-0 -translate-x-1/2`}>
              <button
                type="button"
                aria-label={`Scroll ${title} back`}
                onClick={() => scrollByPage(-1)}
                className={arrowClassName}
              >
                <ChevronDownIcon className="size-4 rotate-90" />
              </button>
            </div>
          )}
          {canScroll.forward && (
            <div className={`${arrowTrackClassName} right-0 translate-x-1/2`}>
              <button
                type="button"
                aria-label={`Scroll ${title} forward`}
                onClick={() => scrollByPage(1)}
                className={arrowClassName}
              >
                <ChevronDownIcon className="size-4 -rotate-90" />
              </button>
            </div>
          )}
        </div>
      ) : (
        <p className="rounded-md border border-line bg-surface px-4 py-6 text-sm text-muted">
          {items === null
            ? `${title} couldn't be loaded right now. Please try again later.`
            : "Nothing to show here yet."}
        </p>
      )}
    </section>
  );
}
