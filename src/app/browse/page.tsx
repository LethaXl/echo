import type { Metadata } from "next";
import BrowseResults from "@/components/media/BrowseResults";
import BrowseSearch from "@/components/media/BrowseSearch";
import EchoTrail from "@/components/media/EchoTrail";
import MediaRow from "@/components/media/MediaRow";
import PageHeader from "@/components/PageHeader";
import { isFiltered, parseBrowseFilters } from "@/lib/browse";
import { echoSelectionIndex, hasEchoPoster } from "@/lib/echo";
import { normalizeSearchQuery } from "@/lib/search";
import {
  getEchoPicks,
  getPopularMovies,
  getPopularTvShows,
  getTrending,
} from "@/lib/tmdb/catalogue";
import { getDiscoveryEcho } from "@/lib/tmdb/echo-discovery";

export const metadata: Metadata = { title: "Browse" };

async function BrowseDiscovery({ echo, seed, echoFrom, previous }: {
  echo: string | string[] | undefined;
  seed: string;
  echoFrom: string | string[] | undefined;
  previous: string | string[] | undefined;
}) {
  const [trending, echoPicks, popularMovies, popularTvShows] = await Promise.all([
    getTrending(),
    getEchoPicks(),
    getPopularMovies(),
    getPopularTvShows(),
  ]);

  const echoStarts = trending?.filter(hasEchoPoster) ?? [];
  const selectedEcho = await getDiscoveryEcho(trending, { echo, seed, echoFrom, previous });
  const echoStart = selectedEcho?.start ?? null;
  const nextSeed = String((Number(seed) + 1) >>> 0);
  const otherStarts = echoStarts.flatMap((item, index) =>
    item.mediaType === echoStart?.mediaType && item.tmdbId === echoStart.tmdbId ? [] : [index],
  );
  const nextIndex = otherStarts[echoSelectionIndex(`${nextSeed}:start`, otherStarts.length)];

  return (
    <div className="flex flex-col gap-14 max-md:gap-8">
      <MediaRow title="Trending Now" items={trending} ranked />
      {selectedEcho && (
        <EchoTrail
          start={selectedEcho.start}
          related={selectedEcho.related}
          nextHref={
            `/browse?seed=${nextSeed}${nextIndex !== undefined ? `&echo=${nextIndex}` : ""}`
              + `&echoFrom=${selectedEcho.start.mediaType}-${selectedEcho.start.tmdbId}`
              + `&echoPrevious=${encodeURIComponent(selectedEcho.id)}`
          }
        />
      )}
      <MediaRow title="Echo Picks" echoMark items={echoPicks} />
      <div className="border-t border-line pt-10 max-md:pt-6">
        <MediaRow title="Popular Movies" items={popularMovies} showMediaType={false} />
      </div>
      <div className="border-t border-line pt-10 max-md:pt-6">
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
          <BrowseDiscovery
            echo={params.echo}
            echoFrom={params.echoFrom}
            previous={params.echoPrevious}
            seed={typeof params.seed === "string" && /^\d{1,10}$/.test(params.seed)
              ? String(Number(params.seed) >>> 0) : "0"}
          />
        )}
      </BrowseSearch>
    </div>
  );
}
