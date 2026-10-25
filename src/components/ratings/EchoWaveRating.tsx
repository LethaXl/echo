"use client";

import { useOptimistic, useRef, useState, useTransition, type KeyboardEvent } from "react";
import { setMyRating } from "@/lib/ratings/actions";
import { RATING_LABELS, RATING_LEVELS, type RatingValue } from "@/lib/ratings/model";
import { XIcon } from "@/components/icons";
import EchoWaveSymbol from "./EchoWaveSymbol";
import type { MediaReference } from "@/types/media";

export default function EchoWaveRating({ item, rating, compact = false, onPendingChange }: {
  item: MediaReference & { title: string };
  rating: RatingValue | null;
  compact?: boolean;
  onPendingChange?: (pending: boolean) => void;
}) {
  const [preview, setPreview] = useState<RatingValue | null>(null);
  const [pending, startTransition] = useTransition();
  const [selected, setSelected] = useOptimistic(rating);
  const [feedback, setFeedback] = useState<{ ok: boolean; message: string } | null>(null);
  const busy = useRef(false);
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  const shown = preview ?? selected;

  function save(next: RatingValue | null) {
    if (busy.current) return;
    if (next === rating) { setPreview(null); return; }
    busy.current = true;
    onPendingChange?.(true);
    setFeedback(null);
    setPreview(null);
    startTransition(async () => {
      setSelected(next);
      try {
        setFeedback(await setMyRating(item.tmdbId, item.mediaType, next));
      } catch {
        setFeedback({ ok: false, message: "Your rating couldn't be saved. Please try again." });
      } finally {
        setPreview(null);
        busy.current = false;
        onPendingChange?.(false);
      }
    });
  }

  function move(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    let next = index;
    if (event.key === "ArrowRight" || event.key === "ArrowUp") next = (index + 1) % 5;
    else if (event.key === "ArrowLeft" || event.key === "ArrowDown") next = (index + 4) % 5;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = 4;
    else return;
    event.preventDefault();
    buttons.current[next]?.focus();
  }

  return (
    <section aria-label={`Your Echo rating for ${item.title}`} aria-busy={pending} className={compact ? "mt-3" : "w-full"}>
      <div className="sr-only">
        <p className={`${compact ? "text-[11px]" : "text-xs"} font-medium text-muted`}>
          {compact ? "Your Echo" : "Your Echo Rating"}
          {pending && <span className="ml-2 text-[10px]">Saving…</span>}
          {!compact && !pending && feedback?.ok && <span aria-hidden="true" className="ml-2 text-[10px] text-accent">Saved</span>}
        </p>
      </div>
      <div className={`flex ${compact ? "items-center gap-1 rounded-lg border border-line bg-background/40 p-1" : "flex-col gap-2.5"}`}>
        <div role="group" aria-label="Choose an Echo rating" className={`flex ${compact ? "min-w-0 flex-1 justify-between gap-0.5" : "w-full items-center rounded-xl border border-line bg-background/40 p-1"}`}
          onMouseLeave={() => setPreview(null)}
          onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setPreview(null); }}>
          {RATING_LEVELS.map((level, index) => (
            <button key={level} type="button" ref={(node) => { buttons.current[index] = node; }}
              aria-label={`Rate ${level} out of 5`}
              aria-pressed={selected === level}
              data-autofocus={level === (rating ?? 1) || undefined}
              title={`${level}/5 · ${RATING_LABELS[level]}`}
              tabIndex={level === (preview ?? selected ?? 1) ? 0 : -1}
              disabled={pending}
              onMouseEnter={() => { if (!busy.current) setPreview(level); }} onFocus={(event) => { if (!busy.current && event.currentTarget.matches(":focus-visible")) setPreview(level); }}
              onKeyDown={(event) => move(event, index)} onClick={() => save(level)}
              className={`group flex min-w-0 flex-1 items-center justify-center rounded-md transition-[color,transform] duration-200 motion-reduce:transition-none ${compact ? "h-8" : "h-12"} ${shown === level ? "text-accent-hover" : "text-muted/60 hover:text-accent-hover"} motion-safe:active:scale-95`}>
              <EchoWaveSymbol level={level} className={compact ? "h-6 w-5 max-w-full" : "h-7 w-6 max-w-full transition-transform duration-200 ease-out motion-safe:group-hover:scale-105 motion-safe:group-focus-visible:scale-105 motion-reduce:transition-none"} />
            </button>
          ))}
        </div>
        <div className={compact ? "shrink-0 border-l border-line px-2 text-center" : "flex min-h-7 items-baseline justify-center gap-2"} aria-hidden="true">
          {shown !== null && <p className={`${compact ? "text-xs text-accent-hover" : "text-lg text-foreground"} font-semibold tabular-nums`}>
            {shown}<span className="text-xs font-normal text-muted">/5</span>
          </p>}
        </div>
        {compact && selected !== null && (
          <button type="button" disabled={pending} onClick={() => save(null)}
            aria-label={`Clear rating for ${item.title}`} title="Clear rating"
            className="flex h-8 w-7 shrink-0 items-center justify-center rounded-md text-muted transition-colors hover:bg-elevated hover:text-accent-hover disabled:opacity-40">
            <XIcon className="size-3.5" />
          </button>
        )}
      </div>
      {!compact && (
        <button type="button" disabled={pending} onClick={() => save(null)}
          aria-label={`Clear rating for ${item.title}`}
          className={`mx-auto mt-3 block rounded-sm text-xs text-muted transition-colors hover:text-foreground disabled:opacity-40 ${selected === null ? "invisible" : ""}`}>Clear rating</button>
      )}
      {feedback && <p role={feedback.ok ? "status" : "alert"}
        className={feedback.ok ? "sr-only" : "mt-2 text-xs text-danger"}>{feedback.message}</p>}
    </section>
  );
}
