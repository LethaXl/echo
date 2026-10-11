"use client";

import Link from "next/link";
import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import TmdbImage from "@/components/details/TmdbImage";
import {
  EchoWaveIcon,
  FilmIcon,
  MaximizeIcon,
  MinimizeIcon,
  PauseIcon,
  PlayIcon,
  RestartIcon,
  SkipForwardIcon,
} from "@/components/icons";
import ViewerBackdrop from "@/components/viewer/ViewerBackdrop";
import SeekBar from "@/components/viewer/SeekBar";
import { formatRuntime } from "@/lib/format";
import { formatPlaybackTime } from "@/lib/viewer/time";
import type { UpNext, ViewerContent } from "@/lib/viewer/types";

const TICK_MS = 250;
const KEY_SEEK_SECONDS = 10;
/** How close to the end the Up Next card appears while playing. */
const UP_NEXT_LEAD_SECONDS = 30;

function subscribeToFullscreen(onChange: () => void) {
  document.addEventListener("fullscreenchange", onChange);
  return () => document.removeEventListener("fullscreenchange", onChange);
}
const noSubscription = () => () => {};

/**
 * One simulated second per real second. The clock measures elapsed time from when play started
 * rather than counting ticks, so it doesn't drift if the browser delays the interval.
 */
function usePlayback(duration: number, autoplay: boolean) {
  const [playing, setPlaying] = useState(autoplay);
  // Whole seconds, for display; re-renders at most once a second while playing.
  const [position, setPosition] = useState(0);
  // Bumped when the position jumps (seek, restart) so a running clock restarts from there.
  const [jumps, setJumps] = useState(0);
  const exactRef = useRef(0);
  const clockRef = useRef<{ from: number; startedAt: number } | null>(null);

  useEffect(() => {
    if (!playing) return;
    const clock = { from: exactRef.current, startedAt: performance.now() };
    const now = () =>
      Math.min(duration, clock.from + (performance.now() - clock.startedAt) / 1000);
    clockRef.current = clock;

    const interval = window.setInterval(() => {
      const exact = now();
      exactRef.current = exact;
      setPosition(Math.floor(exact));
      if (exact >= duration) setPlaying(false);
    }, TICK_MS);

    return () => {
      window.clearInterval(interval);
      // Pausing keeps the exact position; a jump has already cleared the clock and set its own.
      if (clockRef.current === clock) {
        exactRef.current = now();
        clockRef.current = null;
      }
    };
  }, [playing, jumps, duration]);

  function jumpTo(seconds: number) {
    const target = Math.min(duration, Math.max(0, Math.round(seconds)));
    clockRef.current = null;
    exactRef.current = target;
    setPosition(target);
    setJumps((count) => count + 1);
    return target;
  }

  return {
    playing,
    position,
    completed: !playing && position >= duration,
    togglePlay() {
      if (playing) {
        setPlaying(false);
        return;
      }
      if (exactRef.current >= duration) jumpTo(0);
      setPlaying(true);
    },
    // US-34 Restart Simulated Viewing: from 0:00, playing, whatever the current state.
    restart() {
      jumpTo(0);
      setPlaying(true);
    },
    seek(seconds: number) {
      if (jumpTo(seconds) >= duration) setPlaying(false);
    },
    skip(seconds: number) {
      if (jumpTo(exactRef.current + seconds) >= duration) setPlaying(false);
    },
  };
}

function ControlButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className="flex size-10 shrink-0 items-center justify-center rounded-md text-foreground/90 transition-colors hover:bg-foreground/10 hover:text-foreground"
    >
      {children}
    </button>
  );
}

function episodeCode(seasonNumber: number, episodeNumber: number) {
  return seasonNumber === 0 ? `Special ${episodeNumber}` : `S${seasonNumber} · E${episodeNumber}`;
}

function UpNextCard({ upNext }: { upNext: UpNext }) {
  return (
    <Link
      href={upNext.href}
      className="group flex w-full max-w-sm items-center gap-3 rounded-lg bg-background/80 p-2 pr-4 text-left ring-1 ring-foreground/15 transition-colors hover:bg-surface hover:ring-accent/50"
    >
      <TmdbImage
        path={upNext.stillPath}
        size="w300"
        sizes="6rem"
        className="aspect-video w-24 shrink-0"
        fallback={<FilmIcon className="size-5" />}
      />
      <span className="min-w-0">
        <span className="block text-xs font-medium tracking-wide text-accent uppercase">
          Up next
        </span>
        <span className="mt-0.5 block truncate text-sm font-semibold text-foreground">
          {upNext.name}
        </span>
        <span className="block text-xs text-muted">
          {episodeCode(upNext.seasonNumber, upNext.episodeNumber)}
          {upNext.runtimeMinutes ? ` · ${formatRuntime(upNext.runtimeMinutes)}` : ""}
        </span>
      </span>
    </Link>
  );
}

const PANEL_BUTTON_BASE =
  "inline-flex h-9 items-center justify-center gap-2 rounded-md px-3.5 text-sm font-medium transition active:translate-y-px";
const PANEL_BUTTON = {
  primary: `${PANEL_BUTTON_BASE} bg-accent text-on-accent hover:bg-accent-hover`,
  secondary: `${PANEL_BUTTON_BASE} border border-foreground/20 bg-background/40 text-foreground hover:bg-elevated`,
};

/** Shown over the picture once playback reaches the end. */
function FinishedPanel({
  content,
  onReplay,
}: {
  content: ViewerContent;
  onReplay: () => void;
}) {
  const { episode, upNext } = content;
  const finishedName = episode ? episode.name : content.title;
  const replayButton = (variant: keyof typeof PANEL_BUTTON) => (
    <button type="button" onClick={onReplay} className={PANEL_BUTTON[variant]}>
      <RestartIcon className="size-4" />
      Replay
    </button>
  );

  if (!upNext) {
    return (
      <div className="pointer-events-auto flex max-w-md flex-col items-center text-center motion-safe:animate-fade-in-up">
        <p className="text-xs font-medium tracking-[0.08em] text-accent uppercase">Finished</p>
        <p className="mt-1.5 text-lg font-semibold tracking-tight text-balance sm:text-xl">
          {content.endMessage ?? `You finished ${finishedName}.`}
        </p>
        <div className="mt-5 flex flex-wrap justify-center gap-2.5">
          {replayButton("primary")}
          <Link href={content.detailsHref} className={PANEL_BUTTON.secondary}>
            {content.detailsLabel}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="pointer-events-auto w-full max-w-lg motion-safe:animate-fade-in-up">
      <p className="mb-3 truncate text-center text-sm text-foreground/75">
        You finished <span className="font-medium text-foreground">{finishedName}</span>
      </p>
      <div className="flex items-center gap-4 rounded-xl bg-background/85 p-3 shadow-2xl ring-1 shadow-black/50 ring-foreground/15 backdrop-blur-sm">
        <Link
          href={upNext.href}
          tabIndex={-1}
          aria-hidden="true"
          className="group relative w-44 shrink-0 max-sm:hidden"
        >
          <TmdbImage
            path={upNext.stillPath}
            size="w300"
            sizes="11rem"
            className="aspect-video w-full"
            fallback={<FilmIcon className="size-5" />}
          />
          <span className="absolute inset-0 flex items-center justify-center">
            <span className="flex size-10 items-center justify-center rounded-full bg-background/70 ring-1 ring-foreground/25 transition-colors group-hover:bg-accent group-hover:text-on-accent group-hover:ring-accent">
              <PlayIcon className="size-4" />
            </span>
          </span>
        </Link>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium tracking-wide text-accent uppercase">Up next</p>
          <p className="mt-0.5 truncate font-semibold text-foreground">{upNext.name}</p>
          <p className="text-xs text-muted">
            {episodeCode(upNext.seasonNumber, upNext.episodeNumber)}
            {upNext.runtimeMinutes ? ` · ${formatRuntime(upNext.runtimeMinutes)}` : ""}
          </p>
          <div className="mt-3 flex gap-2">
            <Link href={upNext.href} className={PANEL_BUTTON.primary}>
              <SkipForwardIcon className="size-4" />
              Play next
            </Link>
            {replayButton("secondary")}
          </div>
        </div>
      </div>
    </div>
  );
}

// US-32 to US-35: the simulated viewer. No video is played; the timeline, controls and TMDB
// imagery stand in for it.
export default function SimulatedPlayer({
  content,
  autoplay,
}: {
  content: ViewerContent;
  autoplay: boolean;
}) {
  const duration = content.runtimeSeconds;
  const playback = usePlayback(duration, autoplay);
  const { playing, position, completed } = playback;
  const containerRef = useRef<HTMLDivElement>(null);
  const fullscreen = useSyncExternalStore(
    subscribeToFullscreen,
    () => document.fullscreenElement !== null,
    () => false,
  );
  const canFullscreen = useSyncExternalStore(
    noSubscription,
    () => document.fullscreenEnabled,
    () => false,
  );
  const { episode, upNext } = content;
  const isEpisode = episode !== null;
  const showUpNextHint =
    upNext !== null && playing && duration - position <= UP_NEXT_LEAD_SECONDS;

  function toggleFullscreen() {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void containerRef.current?.requestFullscreen().catch(() => {});
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const onControl = event.target !== event.currentTarget;
    if ((event.key === " " || event.key === "Enter") && onControl) return;
    const actions: Record<string, () => void> = {
      " ": playback.togglePlay,
      k: playback.togglePlay,
      ArrowLeft: () => playback.skip(-KEY_SEEK_SECONDS),
      ArrowRight: () => playback.skip(KEY_SEEK_SECONDS),
      f: toggleFullscreen,
    };
    const action = actions[event.key];
    if (!action || event.metaKey || event.ctrlKey || event.altKey) return;
    event.preventDefault();
    action();
  }

  return (
    <div
      ref={containerRef}
      role="region"
      aria-label={`Simulated viewer: ${content.title}`}
      aria-roledescription="video player"
      tabIndex={-1}
      onKeyDown={handleKeyDown}
      className="relative isolate flex aspect-video w-full flex-col overflow-hidden rounded-xl bg-surface ring-1 ring-line select-none focus:outline-none [&:fullscreen]:aspect-auto [&:fullscreen]:rounded-none [&:fullscreen]:ring-0"
    >
      <ViewerBackdrop image={content.backdrop} />
      <div
        aria-hidden="true"
        className={`absolute inset-0 bg-background/50 transition-opacity duration-300 ${completed ? "opacity-100" : "opacity-0"}`}
      />

      {/* Clicking the picture plays or pauses, as on streaming sites; the controls do the same. */}
      <button
        type="button"
        tabIndex={-1}
        aria-hidden="true"
        onClick={playback.togglePlay}
        className="absolute inset-0 cursor-default"
      />

      <div className="pointer-events-none relative flex items-start justify-between gap-4 p-4 sm:p-6">
        <div className="min-w-0">
          {isEpisode && (
            <p className="truncate text-xs font-medium text-foreground/75 sm:text-sm">
              {content.title}
            </p>
          )}
          <h1 className="truncate text-lg leading-tight font-semibold tracking-tight sm:text-2xl">
            {isEpisode ? episode.name : content.title}
          </h1>
          {isEpisode && (
            <p className="mt-1 text-xs text-foreground/75 tabular-nums sm:text-sm">
              {episode.seasonNumber === 0
                ? `Special · Episode ${episode.episodeNumber}`
                : `Season ${episode.seasonNumber} · Episode ${episode.episodeNumber}`}
            </p>
          )}
        </div>
        <p className="flex shrink-0 items-center gap-1.5 text-[0.6875rem] font-medium tracking-[0.08em] text-foreground/70 uppercase">
          <EchoWaveIcon className="size-3.5 text-accent" />
          Simulated viewing
        </p>
      </div>

      <div className="pointer-events-none relative flex flex-1 items-center justify-center px-4">
        {completed ? (
          <FinishedPanel content={content} onReplay={playback.restart} />
        ) : (
          !playing && (
            <button
              type="button"
              aria-label={position > 0 ? "Resume" : "Play"}
              onClick={playback.togglePlay}
              className="pointer-events-auto flex size-14 items-center justify-center rounded-full bg-background/60 text-foreground ring-1 ring-foreground/25 transition-colors hover:bg-accent hover:text-on-accent hover:ring-accent sm:size-18"
            >
              <PlayIcon className="size-6 sm:size-8" />
            </button>
          )
        )}
      </div>

      {showUpNextHint && (
        <div className="pointer-events-none relative flex justify-end px-4 sm:px-6 max-sm:hidden">
          <div className="pointer-events-auto w-72 motion-safe:animate-fade-in-up">
            <UpNextCard upNext={upNext} />
          </div>
        </div>
      )}

      <div className="relative px-3 pt-2 pb-2 sm:px-5 sm:pb-3">
        <SeekBar position={position} duration={duration} onSeek={playback.seek} />
        <div className="mt-1 flex items-center gap-1">
          <ControlButton label={playing ? "Pause" : "Play"} onClick={playback.togglePlay}>
            {playing ? <PauseIcon className="size-5" /> : <PlayIcon className="size-5" />}
          </ControlButton>
          <ControlButton label="Restart from the beginning" onClick={playback.restart}>
            <RestartIcon className="size-5" />
          </ControlButton>
          <p className="ml-2 text-xs text-foreground/85 tabular-nums sm:text-sm">
            <span className="sr-only">Elapsed </span>
            {formatPlaybackTime(position)}
            <span className="text-foreground/50"> / </span>
            <span className="sr-only">of </span>
            {formatPlaybackTime(duration)}
            {content.runtimeEstimated && (
              <span className="text-foreground/50 max-sm:hidden"> · estimated runtime</span>
            )}
          </p>

          <div className="ml-auto flex items-center gap-1">
            {upNext && !completed && (
              <Link
                href={upNext.href}
                aria-label={`Next episode: ${upNext.name}`}
                title={`Next: ${upNext.name}`}
                className="flex h-10 items-center gap-2 rounded-md px-2.5 text-sm font-medium text-foreground/90 transition-colors hover:bg-foreground/10 hover:text-foreground"
              >
                <SkipForwardIcon className="size-5" />
                <span className="max-sm:hidden">Next episode</span>
              </Link>
            )}
            {canFullscreen && (
              <ControlButton
                label={fullscreen ? "Exit full screen" : "Full screen"}
                onClick={toggleFullscreen}
              >
                {fullscreen ? (
                  <MinimizeIcon className="size-5" />
                ) : (
                  <MaximizeIcon className="size-5" />
                )}
              </ControlButton>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
