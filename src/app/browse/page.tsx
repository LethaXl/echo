import type { Metadata } from "next";
import EchoTrail from "@/components/media/EchoTrail";
import MediaRow from "@/components/media/MediaRow";
import {
  getEchoPicks,
  getEchoTrail,
  getPopularMovies,
  getPopularTvShows,
  getTrending,
} from "@/lib/tmdb/catalogue";

export const metadata: Metadata = { title: "Browse" };

/** Reads `?echo=N`, the position of the Echo Trail's start among the Trending titles. */
function parseEchoIndex(value: string | string[] | undefined, count: number): number {
  const index = Number.parseInt(typeof value === "string" ? value : "", 10);
  return count > 0 && Number.isFinite(index) && index >= 0 ? index % count : 0;
}

export default async function BrowsePage({ searchParams }: PageProps<"/browse">) {
  const { echo } = await searchParams;
  const [trending, echoPicks, popularMovies, popularTvShows] = await Promise.all([
    getTrending(),
    getEchoPicks(),
    getPopularMovies(),
    getPopularTvShows(),
  ]);

  const echoStarts = trending?.filter((item) => item.posterPath) ?? [];
  const echoIndex = parseEchoIndex(echo, echoStarts.length);
  const echoStart = echoStarts[echoIndex] ?? null;
  const echoTrail = echoStart ? await getEchoTrail(echoStart) : [];

  return (
    <div data-layout="wide" className="pt-2 pb-4 motion-safe:animate-fade-in-up">
      <header className="flex gap-4">
        <div aria-hidden="true" className="flex gap-[3px]">
          <span className="w-0.5 rounded-full bg-accent/15" />
          <span className="w-0.5 rounded-full bg-accent/45" />
          <span className="w-0.5 rounded-full bg-accent" />
        </div>
        <div>
          <p className="text-[11px] leading-none font-semibold tracking-[0.18em] text-accent uppercase">
            Browse
          </p>
          <h1 className="mt-2 text-[1.75rem] leading-tight font-semibold tracking-tight">
            Find something to watch
          </h1>
          <p className="mt-1 text-[0.9375rem] text-muted">
            Trending titles, standout picks and more to explore.
          </p>
        </div>
      </header>

      <div className="mt-9 flex flex-col gap-14">
        <MediaRow title="Trending Now" items={trending} ranked />
        <EchoTrail
          start={echoStart}
          related={echoTrail}
          nextHref={
            echoStarts.length > 1 ? `/browse?echo=${(echoIndex + 1) % echoStarts.length}` : null
          }
        />
        <MediaRow title="Echo Picks" echoMark items={echoPicks} />
        <div className="border-t border-line pt-10">
          <MediaRow title="Popular Movies" items={popularMovies} showMediaType={false} />
        </div>
        <div className="border-t border-line pt-10">
          <MediaRow title="Popular TV Shows" items={popularTvShows} showMediaType={false} />
        </div>
      </div>
    </div>
  );
}
