import type { Metadata } from "next";
import { notFound } from "next/navigation";
import CastList from "@/components/details/CastList";
import DetailsBackLink from "@/components/details/DetailsBackLink";
import SeasonGrid from "@/components/details/SeasonGrid";
import TitleHero, { type TitleFact } from "@/components/details/TitleHero";
import { formatCalendarDate, formatCount, formatLanguage, formatRuntime } from "@/lib/format";
import { parseRouteNumber } from "@/lib/media-routes";
import { getCurrentSubscription } from "@/lib/subscriptions/queries";
import { parseYear } from "@/lib/tmdb/catalogue";
import { getTvShowDetails } from "@/lib/tmdb/details";
import type { TvShowDetails } from "@/types/media";

const FINISHED_STATUSES = new Set(["Ended", "Canceled"]);

async function loadShow(params: PageProps<"/tv/[id]">["params"]): Promise<TvShowDetails> {
  const showId = parseRouteNumber((await params).id);
  const show = showId === null ? null : await getTvShowDetails(showId);
  if (!show) notFound();
  return show;
}

export async function generateMetadata({ params }: PageProps<"/tv/[id]">): Promise<Metadata> {
  const show = await loadShow(params);
  return { title: show.title, description: show.overview ?? undefined };
}

/** "2016–2019" once a show has finished, otherwise just the first year. */
function airYears(show: TvShowDetails): string | undefined {
  if (!show.year) return undefined;
  const lastYear = parseYear(show.lastAirDate);
  const finished = show.status !== null && FINISHED_STATUSES.has(show.status);
  return finished && lastYear && lastYear !== show.year ? `${show.year}–${lastYear}` : `${show.year}`;
}

function showFacts(show: TvShowDetails): TitleFact[] {
  const facts: TitleFact[] = [];
  if (show.creators.length > 0) facts.push({ label: "Created by", value: show.creators.join(", ") });
  if (show.networks.length > 0) {
    facts.push({
      label: show.networks.length > 1 ? "Networks" : "Network",
      value: show.networks.join(", "),
    });
  }
  if (show.status) facts.push({ label: "Status", value: show.status });
  if (show.firstAirDate) {
    facts.push({ label: "First aired", value: formatCalendarDate(show.firstAirDate) });
  }
  if (show.episodeCount > 0) {
    facts.push({
      label: "Episodes",
      value: show.episodeRuntime
        ? `${formatCount(show.episodeCount)} · about ${formatRuntime(show.episodeRuntime)} each`
        : formatCount(show.episodeCount),
    });
  }
  if (show.originalLanguage) {
    facts.push({ label: "Original language", value: formatLanguage(show.originalLanguage) });
  }
  return facts;
}

// US-10 View Content Details (TV shows), with US-11 View Show Seasons
export default async function TvShowPage({ params }: PageProps<"/tv/[id]">) {
  const [show, subscription] = await Promise.all([loadShow(params), getCurrentSubscription()]);
  const meta = [
    airYears(show),
    show.seasonCount > 0
      ? `${show.seasonCount} ${show.seasonCount === 1 ? "season" : "seasons"}`
      : undefined,
    show.genres.join(", ") || undefined,
  ].filter((item): item is string => Boolean(item));

  return (
    <div data-layout="wide" className="pt-2 pb-10 motion-safe:animate-fade-in-up">
      <DetailsBackLink href="/browse" label="Back to Browse" />
      <div className="mt-6">
        <TitleHero
          title={show}
          meta={meta}
          facts={showFacts(show)}
          hasEchoPlus={subscription !== null}
        />
      </div>
      <div className="mt-18 flex flex-col gap-18">
        <CastList cast={show.cast} />
        <SeasonGrid show={show} />
      </div>
    </div>
  );
}
