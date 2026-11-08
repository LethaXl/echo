import type { ReactNode } from "react";
import DetailsBackLink from "@/components/details/DetailsBackLink";

/**
 * Desktop fits a 16:9 column into the height left under the navbar, with page scrolling below
 * the minimum height. Mobile uses a full-width, normal-flow layout.
 * The desktop 2.5rem allowance is the line above the player (1.5rem) and its gap (mt-4).
 */
export function ViewerLayout({ top, children }: { top: ReactNode; children: ReactNode }) {
  return (
    <div data-layout="wide" className="relative min-h-80 flex-1 max-md:min-h-0 max-md:flex-none">
      {/* Desktop positioning gives the container a definite height; a flexed one reads as 0cqh. */}
      <div className="absolute inset-0 flex justify-center [container-type:size] max-md:static max-md:block max-md:[container-type:normal]">
        <div className="w-[min(100cqw,calc((100cqh_-_2.5rem)*16/9))] max-md:w-full">
          <div className="h-6 max-md:h-auto max-md:[&>a]:min-h-11 max-md:[&>a]:max-w-full max-md:[&>a]:break-words max-md:[&>a>svg]:shrink-0">{top}</div>
          <div className="mt-4 max-md:mt-2">{children}</div>
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
    <div className="flex flex-1 flex-col motion-safe:animate-fade-in-up max-md:flex-none">
      <ViewerLayout top={<DetailsBackLink href={backHref} label={backLabel} />}>
        {children}
      </ViewerLayout>
    </div>
  );
}

/** A still viewing area with a centred message, for when the player can't open. */
export function ViewerScreen({ backdrop, children }: { backdrop: ReactNode; children: ReactNode }) {
  return (
    <div className="relative isolate flex aspect-video w-full items-center justify-center overflow-hidden rounded-xl bg-surface ring-1 ring-line max-md:aspect-auto max-md:min-h-56 max-md:py-6 max-md:[overflow-wrap:anywhere] max-md:[&_a]:min-h-11">
      {backdrop}
      <div className="relative flex max-w-md flex-col items-center px-6 text-center">{children}</div>
    </div>
  );
}
