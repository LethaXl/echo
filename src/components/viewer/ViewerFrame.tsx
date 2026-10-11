import type { ReactNode } from "react";
import DetailsBackLink from "@/components/details/DetailsBackLink";

/**
 * Fills the height left under the navbar and sizes a 16:9 column to fit it, so the viewer never
 * makes the page scroll. Below a minimum height the page scrolls instead of shrinking the player.
 * The 2.5rem is the line above the player (1.5rem) and the gap under it (mt-4).
 */
export function ViewerLayout({ top, children }: { top: ReactNode; children: ReactNode }) {
  return (
    <div data-layout="wide" className="relative min-h-80 flex-1">
      {/* Absolutely positioned so the container has a definite height; a flexed one reads as 0cqh. */}
      <div className="absolute inset-0 flex justify-center [container-type:size]">
        <div className="w-[min(100cqw,calc((100cqh_-_2.5rem)*16/9))]">
          <div className="h-6">{top}</div>
          <div className="mt-4">{children}</div>
        </div>
      </div>
    </div>
  );
}

/** The viewing area with the way back to the details page above it. */
export default function ViewerFrame({
  backHref,
  backLabel,
  children,
}: {
  backHref: string;
  backLabel: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-1 flex-col motion-safe:animate-fade-in-up">
      <ViewerLayout top={<DetailsBackLink href={backHref} label={backLabel} />}>
        {children}
      </ViewerLayout>
    </div>
  );
}

/** A still viewing area with a centred message, for when the player can't open. */
export function ViewerScreen({ backdrop, children }: { backdrop: ReactNode; children: ReactNode }) {
  return (
    <div className="relative isolate flex aspect-video w-full items-center justify-center overflow-hidden rounded-xl bg-surface ring-1 ring-line">
      {backdrop}
      <div className="relative flex max-w-md flex-col items-center px-6 text-center">{children}</div>
    </div>
  );
}
