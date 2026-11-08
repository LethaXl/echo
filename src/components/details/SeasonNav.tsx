import scrollStyles from "@/components/media/MobileScroll.module.css";
import Link from "next/link";
import SeasonPicker from "@/components/details/SeasonPicker";
import { formatSeasonLabel } from "@/lib/format";
import { seasonHref } from "@/lib/media-routes";
import type { SeasonSummary } from "@/types/media";

/** More numbered seasons than this get a dropdown instead of tabs. */
const MAX_SEASON_TABS = 12;

type SeasonNavProps = {
  showId: number;
  seasons: SeasonSummary[];
  currentSeasonNumber: number;
};

export default function SeasonNav({ showId, seasons, currentSeasonNumber }: SeasonNavProps) {
  if (seasons.length < 2) return null;

  const numberedCount = seasons.filter((season) => season.seasonNumber > 0).length;
  if (numberedCount > MAX_SEASON_TABS) {
    return (
      <SeasonPicker showId={showId} seasons={seasons} currentSeasonNumber={currentSeasonNumber} />
    );
  }

  return (
    <nav aria-label="Seasons" className="border-b border-line">
      <div className={`${scrollStyles.scroller} -mb-px flex gap-7 overflow-x-auto [scrollbar-width:none] max-md:gap-5 max-md:overscroll-x-contain`}>
        {seasons.map((season) => {
          const current = season.seasonNumber === currentSeasonNumber;
          return (
            <Link
              key={season.seasonNumber}
              href={seasonHref(showId, season.seasonNumber)}
              aria-current={current ? "page" : undefined}
              className={`shrink-0 max-md:inline-flex max-md:min-h-11 max-md:items-center max-md:py-2 rounded-t-sm border-b-2 pt-1 pb-3 text-[0.9375rem] font-medium whitespace-nowrap transition-colors duration-150 ${
                current
                  ? "border-accent text-foreground"
                  : "border-transparent text-muted hover:border-muted/40 hover:text-foreground"
              }`}
            >
              {formatSeasonLabel(season.seasonNumber)}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
