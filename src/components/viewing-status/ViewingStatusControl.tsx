"use client";

import { useRef, useState, useTransition } from "react";
import { CircleCheckIcon, EyeIcon, XIcon } from "@/components/icons";
import { FilterMenu } from "@/components/media/BrowseFilterBar";
import { setViewingStatus } from "@/lib/viewing-status/actions";
import { VIEWING_STATUSES, type ViewingStatus } from "@/lib/viewing-status/model";
import type { MediaReference } from "@/types/media";

export default function ViewingStatusControl({ item, status, compact = false }: {
  item: MediaReference & { title?: string };
  status: ViewingStatus | null;
  compact?: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const busy = useRef(false);
  const [feedback, setFeedback] = useState<{ ok: boolean; message: string } | null>(null);

  const mobileOptionClassName = compact
    ? "max-md:h-9 max-md:gap-1.5 max-md:px-1.5 max-md:text-[11px]"
    : "max-md:h-11";

  function change(next: ViewingStatus | null) {
    if (busy.current || next === status) return;
    busy.current = true;
    setFeedback(null);
    startTransition(async () => {
      try {
        setFeedback(await setViewingStatus(item.tmdbId, item.mediaType, next));
      } catch {
        setFeedback({ ok: false, message: "Viewing status couldn't be updated. Please try again." });
      } finally { busy.current = false; }
    });
  }

  return (
    <div aria-busy={pending} className={compact ? "relative" : undefined}>
      <FilterMenu
        icon={status === "completed" ? <CircleCheckIcon className="size-3.5" /> : status === "watching" ? <EyeIcon className="size-3.5" /> : null}
        label=""
        value={status ? VIEWING_STATUSES[status] : "Track viewing"}
        tone="neutral"
        active={status !== null}
        disabled={pending}
        ariaLabel={`Viewing status for ${item.title ?? "this title"}: ${status ? VIEWING_STATUSES[status] : "Not tracked"}`}
        size={compact ? "md" : "lg"}
        triggerClassName={compact ? undefined : "w-40 justify-center"}
        iconOnly={compact}
        align={compact ? "right" : "left"}
        panelClassName={compact ? "w-38 max-md:w-28 max-md:-mt-2 max-md:p-1 max-md:rounded-lg" : "w-38 max-md:w-32"}
      >
        {(Object.keys(VIEWING_STATUSES) as ViewingStatus[]).map((option) => {
          const Icon = option === "watching" ? EyeIcon : CircleCheckIcon;
          const selected = status === option;
          return (
            <button key={option} type="button" aria-pressed={selected} onClick={() => change(option)}
              className={`flex h-8 ${mobileOptionClassName} w-full items-center justify-center gap-2 rounded-md px-2.5 text-xs transition-colors hover:bg-surface ${selected ? "font-medium text-accent" : "text-foreground"}`}>
              <Icon className={`size-3.5 shrink-0 ${selected ? "text-accent" : "text-muted"}`} />
              {VIEWING_STATUSES[option]}
            </button>
          );
        })}
        <div className="my-1 border-t border-line" />
        <button type="button" disabled={status === null} onClick={() => change(null)}
          className={`flex h-8 ${mobileOptionClassName} w-full items-center justify-center gap-2 rounded-md px-2.5 text-xs text-muted transition-colors hover:bg-surface hover:text-foreground disabled:pointer-events-none disabled:opacity-40`}>
          <XIcon className="size-3.5" />Clear status
        </button>
      </FilterMenu>
      {feedback && (
        <p role={feedback.ok ? "status" : "alert"}
          className={feedback.ok ? "sr-only" : compact ? "absolute top-full right-0 z-20 mt-2 w-48 max-md:fixed max-md:top-auto max-md:right-4 max-md:bottom-4 max-md:left-4 max-md:w-auto rounded-md border border-line bg-surface p-2 text-xs text-danger" : "mt-2 max-w-xs text-xs text-danger"}>
          {feedback.message}
        </p>
      )}
    </div>
  );
}
