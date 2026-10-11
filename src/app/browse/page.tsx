import type { Metadata } from "next";
import BrowseResults from "@/components/media/BrowseResults";
import BrowseSearch from "@/components/media/BrowseSearch";
import EchoTrail from "@/components/media/EchoTrail";
import MediaRow from "@/components/media/MediaRow";
import PageHeader from "@/components/PageHeader";
import { isFiltered, parseBrowseFilters } from "@/lib/browse";
import { normalizeSearchQuery } from "@/lib/search";
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

async function BrowseDiscovery({ echo }: { echo: string | string[] | undefined }) {
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
    <div className="flex flex-col gap-14">
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
  );
}

export default async function BrowsePage({ searchParams }: PageProps<"/browse">) {
  const params = await searchParams;
  const query = normalizeSearchQuery(params.q);
  const filters = parseBrowseFilters(params);

  return (
    <div data-layout="wide" className="pt-2 pb-4 motion-safe:animate-fade-in-up">
      <BrowseSearch
        query={query}
        filters={filters}
        header={
          <PageHeader
            eyebrow="Browse"
            title="Find something to watch"
            description="Trending titles, standout picks and more to explore."
          />
        }
      >
        {query || isFiltered(filters) ? (
          <BrowseResults query={query} filters={filters} />
        ) : (
          <BrowseDiscovery echo={params.echo} />
        )}
      </BrowseSearch>
    </div>
  );
}
