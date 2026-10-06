import Link from "next/link";
import { seasonHref } from "@/lib/media-routes";
import type { SeasonSummary } from "@/types/media";

type SeasonNavProps = {
  showId: number;
  seasons: SeasonSummary[];
  currentSeasonNumber: number;
};

export default function SeasonNav({ showId, seasons, currentSeasonNumber }: SeasonNavProps) {
  if (seasons.length < 2) return null;

  return (
    <nav aria-label="Seasons" className="flex flex-wrap items-center gap-2">
      <span aria-hidden="true" className="mr-1 text-sm text-muted">
        Season
      </span>
      {seasons.map((season) => {
        const current = season.seasonNumber === currentSeasonNumber;
        return (
          <Link
            key={season.seasonNumber}
            href={seasonHref(showId, season.seasonNumber)}
            aria-label={season.name}
            aria-current={current ? "page" : undefined}
            className={`inline-flex h-8 min-w-8 items-center justify-center rounded-md border px-2.5 text-sm font-medium tabular-nums transition-colors duration-150 ${
              current
                ? "border-accent/60 text-accent"
                : "border-line text-muted hover:border-muted/60 hover:text-foreground"
            }`}
          >
            {season.seasonNumber === 0 ? "Specials" : season.seasonNumber}
          </Link>
        );
      })}
    </nav>
  );
}
