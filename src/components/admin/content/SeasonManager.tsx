"use client";

import { useRef, useState, type ReactNode } from "react";
import { ChevronDownIcon } from "@/components/icons";
import {
  loadSeason,
  saveEpisodeDetails,
  setEpisodeHidden,
  setSeasonHidden,
} from "@/lib/admin/content-actions";
import type { EpisodeItem, SeasonItem } from "@/lib/admin/content-queries";
import { formatCalendarDate, formatEpisodeCount } from "@/lib/format";
import ConfirmActionButton from "./ConfirmActionButton";
import { StatusLabel } from "./ContentStatusLabel";
import EditContentButton from "./EditContentButton";
import { EMPTY_NOTE, PANEL, SMALL_BUTTON } from "./styles";

type SeasonManagerProps = {
  showId: number;
  showHidden: boolean;
  seasons: SeasonItem[];
};

type Parent = "show" | "season" | null;

const without = <T,>(record: Record<number, T>, key: number) => {
  const next = { ...record };
  delete next[key];
  return next;
};

/** Shown only when something isn't visible: hidden on its own, or because its parent is. */
function Availability({ hidden, parent }: { hidden: boolean; parent: Parent }) {
  if (hidden) return <StatusLabel tone="danger">Hidden</StatusLabel>;
  if (parent) return <StatusLabel tone="muted">{`Unavailable · ${parent} hidden`}</StatusLabel>;
  return null;
}

function Meta({ children }: { children: ReactNode[] }) {
  const items = children.filter(Boolean);
  if (items.length === 0) return null;
  return (
    <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted">
      {items.map((item, index) => (
        <span key={index} className="flex items-center gap-2">
          {index > 0 && <span aria-hidden="true">·</span>}
          {item}
        </span>
      ))}
    </span>
  );
}

// US-54 to US-57: every TMDB season and episode can be hidden, restored or (episodes) edited directly.
export default function SeasonManager({ showId, showHidden, seasons }: SeasonManagerProps) {
  const [renderedSeasons, setRenderedSeasons] = useState(seasons);
  // Seasons reloaded after a change, newer than what the page was rendered with.
  const [summaries, setSummaries] = useState<Record<number, SeasonItem>>({});
  const [episodes, setEpisodes] = useState<Record<number, EpisodeItem[]>>({});
  const [errors, setErrors] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState<Record<number, boolean>>({});
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});
  const requests = useRef<Record<number, number>>({});

  // The page was refreshed: its seasons are the newest.
  if (seasons !== renderedSeasons) {
    setRenderedSeasons(seasons);
    setSummaries({});
  }

  async function load(seasonNumber: number) {
    const request = (requests.current[seasonNumber] ?? 0) + 1;
    requests.current[seasonNumber] = request;
    setLoading((current) => ({ ...current, [seasonNumber]: true }));
    const result = await loadSeason(showId, seasonNumber).catch(() => ({
      ok: false as const,
      message: "Episodes couldn't be loaded. Try again in a moment.",
    }));
    // A newer load for this season has started; its result wins.
    if (requests.current[seasonNumber] !== request) return;
    setLoading((current) => without(current, seasonNumber));
    if (result.ok) {
      setSummaries((current) => ({ ...current, [seasonNumber]: result.season }));
      setEpisodes((current) => ({ ...current, [seasonNumber]: result.episodes }));
      setErrors((current) => without(current, seasonNumber));
    } else {
      setErrors((current) => ({ ...current, [seasonNumber]: result.message }));
    }
  }

  function toggle(seasonNumber: number) {
    const open = !expanded[seasonNumber];
    setExpanded((current) => ({ ...current, [seasonNumber]: open }));
    if (open && !episodes[seasonNumber] && !loading[seasonNumber]) load(seasonNumber);
  }

  const items = seasons.map((season) => summaries[season.seasonNumber] ?? season);

  return (
    <section aria-labelledby="seasons-heading" className="mt-12">
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h2 id="seasons-heading" className="text-lg font-semibold tracking-tight">
          Seasons and episodes
        </h2>
        <p className="text-sm text-muted">
          {items.length} {items.length === 1 ? "season" : "seasons"}
        </p>
      </div>

      {showHidden && (
        <p className="mb-3 rounded-lg border border-line bg-surface px-4 py-3 text-sm text-muted">
          This show is hidden, so none of its seasons or episodes are available. Each keeps its own setting
          for when the show is restored.
        </p>
      )}

      {items.length === 0 ? (
        <p className={EMPTY_NOTE}>TMDB doesn&apos;t list any seasons for this show yet.</p>
      ) : (
        <ul className={`${PANEL} divide-y divide-line overflow-hidden`}>
          {items.map((season) => (
            <SeasonRow
              key={season.seasonNumber}
              showId={showId}
              season={season}
              showHidden={showHidden}
              open={Boolean(expanded[season.seasonNumber])}
              episodes={episodes[season.seasonNumber]}
              error={errors[season.seasonNumber]}
              loading={Boolean(loading[season.seasonNumber])}
              onToggle={() => toggle(season.seasonNumber)}
              onChanged={() => load(season.seasonNumber)}
            />
          ))}
        </ul>
      )}
    </section>
  );
}

type SeasonRowProps = {
  showId: number;
  season: SeasonItem;
  showHidden: boolean;
  open: boolean;
  episodes: EpisodeItem[] | undefined;
  error: string | undefined;
  loading: boolean;
  onToggle: () => void;
  onChanged: () => void;
};

function SeasonRow({ showId, season, showHidden, open, episodes, error, loading, onToggle, onChanged }: SeasonRowProps) {
  const { seasonNumber, name, hidden } = season;
  const panelId = `season-${seasonNumber}-episodes`;

  return (
    <li aria-busy={loading || undefined}>
      <div
        className={`flex items-center gap-3 px-4 py-3 transition-colors duration-150 ${open ? "bg-elevated/50" : "hover:bg-elevated/30"}`}
      >
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          aria-controls={panelId}
          className="flex min-w-0 flex-1 items-center gap-3 rounded-md text-left focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
        >
          <ChevronDownIcon
            className={`size-4 shrink-0 text-muted transition-transform duration-150 ${open ? "" : "-rotate-90"}`}
          />
          <span className="min-w-0">
            <span className="block truncate text-sm font-medium">{name}</span>
            <Meta>
              {[
                <span key="count">{formatEpisodeCount(season.episodeCount)}</span>,
                season.hiddenEpisodes > 0 && <span key="hidden-episodes">{season.hiddenEpisodes} hidden</span>,
                !season.onTmdb && <span key="tmdb">No longer on TMDB</span>,
                (hidden || showHidden) && (
                  <Availability key="availability" hidden={hidden} parent={showHidden ? "show" : null} />
                ),
              ]}
            </Meta>
          </span>
        </button>
        <ConfirmActionButton
          label={hidden ? "Restore" : "Hide"}
          className="w-[4.5rem]"
          disabled={loading}
          action={setSeasonHidden}
          fields={{ tmdbId: String(showId), seasonNumber: String(seasonNumber), hidden: String(!hidden) }}
          title={`${hidden ? "Restore" : "Hide"} ${name}?`}
          description={
            hidden
              ? `Its episodes become available again, except ones hidden on their own.${showHidden ? " The show is still hidden, so nothing appears until it's restored." : ""}`
              : "The season and its episodes disappear from Echo and can't be watched. Episodes keep their own settings for when it's restored."
          }
          confirmLabel={hidden ? "Restore" : "Hide"}
          pendingLabel={hidden ? "Restoring" : "Hiding"}
          confirmVariant={hidden ? "primary" : "danger"}
          successTitle={hidden ? "Restored" : "Hidden"}
          onDone={onChanged}
        />
      </div>

      {open && (
        <div id={panelId} className="border-t border-line bg-background/40">
          {hidden && !showHidden && (
            <p className="px-4 pt-3 pl-11 text-xs text-muted">
              This season is hidden, so its episodes aren&apos;t available. Each keeps its own setting.
            </p>
          )}
          <EpisodeList
            showId={showId}
            season={season}
            parent={showHidden ? "show" : hidden ? "season" : null}
            episodes={episodes}
            error={error}
            loading={loading}
            onChanged={onChanged}
          />
        </div>
      )}
    </li>
  );
}

function EpisodeList({
  showId,
  season,
  parent,
  episodes,
  error,
  loading,
  onChanged,
}: {
  showId: number;
  season: SeasonItem;
  parent: Parent;
  episodes: EpisodeItem[] | undefined;
  error: string | undefined;
  loading: boolean;
  onChanged: () => void;
}) {
  if (!episodes) {
    if (error) {
      return (
        <div role="alert" className="flex items-center justify-between gap-3 px-4 py-4 pl-11 text-sm text-danger">
          <span>{error}</span>
          <button type="button" onClick={onChanged} className={SMALL_BUTTON}>
            Retry
          </button>
        </div>
      );
    }
    return (
      <div role="status" aria-label="Loading episodes" className="flex flex-col gap-3 px-4 py-4 pl-11">
        {[0, 1, 2].map((index) => (
          <div key={index} className="flex items-center gap-3">
            <div className="h-3 w-6 animate-pulse rounded bg-elevated" />
            <div className="h-3 w-48 animate-pulse rounded bg-elevated" />
          </div>
        ))}
      </div>
    );
  }

  if (episodes.length === 0) {
    return <p className="px-4 py-4 pl-11 text-sm text-muted">No episodes are listed for this season.</p>;
  }

  return (
    <>
      {error && (
        <p role="alert" className="px-4 pt-3 pl-11 text-xs text-danger">
          {error}
        </p>
      )}
      <ul className={`divide-y divide-line/60 transition-opacity duration-150 ${loading ? "opacity-60" : ""}`}>
        {episodes.map((episode) => (
          <EpisodeRow
            key={episode.episodeNumber}
            showId={showId}
            seasonNumber={season.seasonNumber}
            seasonName={season.name}
            episode={episode}
            parent={parent}
            busy={loading}
            onChanged={onChanged}
          />
        ))}
      </ul>
    </>
  );
}

function EpisodeRow({
  showId,
  seasonNumber,
  seasonName,
  episode,
  parent,
  busy,
  onChanged,
}: {
  showId: number;
  seasonNumber: number;
  seasonName: string;
  episode: EpisodeItem;
  parent: Parent;
  busy: boolean;
  onChanged: () => void;
}) {
  const { episodeNumber, name, hidden } = episode;
  const fields = {
    tmdbId: String(showId),
    seasonNumber: String(seasonNumber),
    episodeNumber: String(episodeNumber),
  };
  const parentNote =
    parent === "show"
      ? " The show is still hidden, so it stays unavailable until the show is restored."
      : parent === "season"
        ? ` ${seasonName} is still hidden, so it stays unavailable until the season is restored.`
        : "";

  return (
    <li className="flex items-center gap-3 py-2.5 pr-4 pl-11 transition-colors duration-150 hover:bg-elevated/25">
      <span className="w-8 shrink-0 text-xs font-medium text-muted tabular-nums">E{episodeNumber}</span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm">{name}</p>
        <Meta>
          {[
            episode.airDate && <span key="date">{formatCalendarDate(episode.airDate)}</span>,
            episode.edited && (
              <span key="edited" className="text-accent">
                Edited
              </span>
            ),
            !episode.onTmdb && <span key="tmdb">No longer on TMDB</span>,
            (hidden || parent) && <Availability key="availability" hidden={hidden} parent={parent} />,
          ]}
        </Meta>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {episode.fields && (
          <EditContentButton
            disabled={busy}
            title={`${seasonName} · Episode ${episodeNumber}`}
            fields={episode.fields}
            hiddenFields={fields}
            action={saveEpisodeDetails}
            onDone={onChanged}
          />
        )}
        <ConfirmActionButton
          label={hidden ? "Restore" : "Hide"}
          className="w-[4.5rem]"
          disabled={busy}
          action={setEpisodeHidden}
          fields={{ ...fields, hidden: String(!hidden) }}
          title={`${hidden ? "Restore" : "Hide"} episode ${episodeNumber}?`}
          description={
            hidden
              ? `“${name}” returns to the episode list and can be watched again.${parentNote}`
              : `“${name}” disappears from the episode list and can't be watched. Members' history is kept.`
          }
          confirmLabel={hidden ? "Restore" : "Hide"}
          pendingLabel={hidden ? "Restoring" : "Hiding"}
          confirmVariant={hidden ? "primary" : "danger"}
          successTitle={hidden ? "Restored" : "Hidden"}
          onDone={onChanged}
        />
      </div>
    </li>
  );
}
