import { FilmIcon } from "@/components/icons";
import TmdbImage from "@/components/details/TmdbImage";
import { formatCalendarDate, formatRuntime, isFutureCalendarDate } from "@/lib/format";
import type { Episode } from "@/types/media";

function episodeMeta(episode: Episode): string[] {
  const meta: string[] = [];
  if (episode.runtime) meta.push(formatRuntime(episode.runtime));
  if (episode.airDate) {
    const date = formatCalendarDate(episode.airDate);
    meta.push(isFutureCalendarDate(episode.airDate) ? `Airs ${date}` : date);
  }
  return meta;
}

// US-12 View Season Episodes
export default function EpisodeList({ episodes }: { episodes: Episode[] }) {
  return (
    <section aria-labelledby="episodes-heading">
      <h2
        id="episodes-heading"
        className="mb-5 flex items-baseline gap-2 text-xl font-semibold tracking-tight"
      >
        Episodes
        {episodes.length > 0 && (
          <span className="text-sm font-normal text-muted tabular-nums">{episodes.length}</span>
        )}
      </h2>

      {episodes.length > 0 ? (
        <ol className="divide-y divide-line border-t border-line">
          {episodes.map((episode) => {
            const meta = episodeMeta(episode);
            return (
              <li
                key={episode.id}
                className="grid grid-cols-[12rem_minmax(0,1fr)] gap-6 py-6 lg:grid-cols-[14rem_minmax(0,1fr)] xl:grid-cols-[15rem_minmax(0,1fr)] xl:gap-8"
              >
                <TmdbImage
                  path={episode.stillPath}
                  size="w300"
                  sizes="15rem"
                  className="aspect-video ring-1 ring-line"
                  fallback={<FilmIcon className="size-6" />}
                />
                <div className="max-w-[52rem] min-w-0">
                  <p className="text-[0.8125rem] font-medium text-muted tabular-nums">
                    Episode {episode.episodeNumber}
                  </p>
                  <h3 className="mt-1 text-[1.0625rem] leading-snug font-semibold">
                    {episode.name}
                  </h3>
                  {meta.length > 0 && (
                    <p className="mt-1.5 text-[0.8125rem] text-muted">{meta.join(" · ")}</p>
                  )}
                  <p className="mt-3 line-clamp-3 text-[0.9375rem] leading-relaxed text-foreground/75">
                    {episode.overview ?? "No description is available for this episode yet."}
                  </p>
                </div>
              </li>
            );
          })}
        </ol>
      ) : (
        <p className="rounded-md border border-line bg-surface px-4 py-6 text-sm text-muted">
          No episodes are listed for this season yet.
        </p>
      )}
    </section>
  );
}
