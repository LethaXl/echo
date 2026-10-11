import ButtonLink from "@/components/ButtonLink";
import EchoPlus from "@/components/EchoPlus";
import ViewerBackdrop from "@/components/viewer/ViewerBackdrop";
import ViewerFrame, { ViewerScreen } from "@/components/viewer/ViewerFrame";
import type { ViewerImage } from "@/lib/viewer/types";

// US-32: Echo Free members are offered Echo+ instead of the player.
export default function WatchUpgradePrompt({
  title,
  backdrop,
  backHref,
  backLabel,
}: {
  title: string;
  backdrop: ViewerImage;
  backHref: string;
  backLabel: string;
}) {
  return (
    <ViewerFrame backHref={backHref} backLabel={backLabel}>
      <ViewerScreen backdrop={<ViewerBackdrop image={backdrop} />}>
        <h1 className="text-xl font-semibold tracking-tight text-balance sm:text-2xl">
          Watch {title} with <EchoPlus />
        </h1>
        <p className="mt-2 text-sm text-foreground/80 sm:text-base">
          Viewing is included with <EchoPlus />, along with your watchlist and ratings.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <ButtonLink href="/plans">View plans</ButtonLink>
          <ButtonLink href={backHref} variant="secondary" className="bg-background/40">
            Not now
          </ButtonLink>
        </div>
      </ViewerScreen>
    </ViewerFrame>
  );
}
