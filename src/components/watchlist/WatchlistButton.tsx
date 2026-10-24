"use client";

import { useRef, useState, useTransition } from "react";
import Link from "next/link";
import { buttonClassName } from "@/components/ButtonLink";
import { SpinnerIcon, XIcon } from "@/components/icons";
import { setWatchlistSaved } from "@/lib/watchlist/actions";
import type { MediaReference } from "@/types/media";

export default function WatchlistButton({ item, saved, compact = false, onSuccess }: {
  item: MediaReference & { title?: string }; saved: boolean; compact?: boolean; onSuccess?: (message: string) => void;
}) {
  const [pending, startTransition] = useTransition();
  const busy = useRef(false);
  const [justSaved, setJustSaved] = useState(false);
  const [feedback, setFeedback] = useState<{ ok: boolean; message: string } | null>(null);
  function change() {
    if (busy.current || (!compact && saved)) return;
    busy.current = true;
    setJustSaved(false);
    setFeedback(null);
    startTransition(async () => {
      try {
        const result = await setWatchlistSaved(item.tmdbId, item.mediaType, !saved);
        setFeedback(compact && result.ok ? null : result);
        if (result.ok) {
          if (!compact && !saved) setJustSaved(true);
          if (!compact) onSuccess?.(result.message);
        }
      } catch {
        setFeedback({ ok: false, message: "Your watchlist couldn't be updated. Please try again." });
      } finally { busy.current = false; }
    });
  }
  return (
    <div className={compact ? "relative" : undefined}>
      {!compact && saved ? (
        <Link
          href="/cave#watchlist"
          className={`${justSaved ? "watchlist-save-confirmation" : ""} inline-flex h-11 min-w-48 items-center justify-center rounded-md border border-accent/60 bg-transparent px-6 text-sm font-semibold text-foreground transition-colors duration-200 hover:border-accent hover:bg-elevated motion-reduce:transition-none`}
        >
          <span className="motion-safe:animate-pop-in">In Watchlist</span>
        </Link>
      ) : (
      <button type="button" disabled={pending} onClick={change}
        aria-busy={pending}
        aria-label={compact ? `Remove ${item.title ?? "title"} from watchlist` : "Add to Watchlist"}
        title={compact ? (pending ? "Removing…" : "Remove from watchlist") : undefined}
        className={compact
          ? "flex size-7 items-center justify-center rounded-sm text-accent transition-colors hover:text-accent-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-wait disabled:opacity-60"
          : `${buttonClassName("secondary", "lg")} min-w-48`}>
        {compact ? (
          <>
            {pending ? <SpinnerIcon className="size-4" /> : <XIcon className="size-4" />}
            <span className="sr-only">{pending ? "Removing…" : "Remove"}</span>
          </>
        ) : "Add to Watchlist"}
      </button>
      )}
      {feedback && <p role={feedback.ok ? "status" : "alert"}
        className={`${!compact && feedback.ok ? "sr-only" : compact ? "absolute top-full right-0 z-20 mt-2 w-48 rounded-md border border-line bg-surface p-2 shadow-md" : "mt-2 max-w-xs"} text-xs ${feedback.ok ? "text-accent" : "text-danger"}`}>
        {feedback.message}
      </p>}
    </div>
  );
}
