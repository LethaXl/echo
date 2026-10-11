"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { ChevronDownIcon } from "@/components/icons";
import { formatSeasonLabel } from "@/lib/format";
import { seasonHref } from "@/lib/media-routes";
import type { SeasonSummary } from "@/types/media";

/** A dropdown of seasons for shows with too many for a row of tabs; styled like Browse's filters. */
export default function SeasonPicker({
  showId,
  seasons,
  currentSeasonNumber,
}: {
  showId: number;
  seasons: SeasonSummary[];
  currentSeasonNumber: number;
}) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const list = listRef.current;
    const selected =
      list?.querySelector<HTMLElement>('[aria-current="page"]') ?? list?.querySelector("a");
    selected?.focus({ preventScroll: true });
    // Centres the current season inside the list without scrolling the page.
    if (selected && list && list.scrollHeight > list.clientHeight) {
      list.scrollTop = selected.offsetTop - (list.clientHeight - selected.offsetHeight) / 2;
    }

    function handlePointerDown(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      setOpen(false);
      triggerRef.current?.focus();
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <nav aria-label="Seasons">
      <div
        ref={containerRef}
        className="relative inline-block"
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
        }}
      >
        <button
          ref={triggerRef}
          type="button"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen((current) => !current)}
          className={`flex h-9 items-center gap-1.5 rounded-full border pr-3 pl-3.5 text-[13px] whitespace-nowrap transition-colors duration-150 ${
            open
              ? "border-muted/40 bg-elevated"
              : "border-line bg-surface hover:border-muted/40 hover:bg-elevated"
          }`}
        >
          <span className="text-muted">Season</span>
          <span className="font-semibold text-foreground">
            {currentSeasonNumber === 0 ? "Specials" : currentSeasonNumber}
          </span>
          <ChevronDownIcon
            className={`size-3.5 text-muted transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          />
        </button>

        {open && (
          <div
            id={panelId}
            className="absolute top-full left-0 z-30 mt-1.5 w-40 rounded-xl border border-accent/35 bg-elevated p-1.5 shadow-2xl shadow-black/60 ring-1 ring-accent/10 motion-safe:animate-menu-in"
          >
            <div
              ref={listRef}
              className="relative -mr-1 max-h-72 overflow-y-auto overscroll-contain pr-1 [scrollbar-color:color-mix(in_srgb,var(--color-accent)_45%,transparent)_transparent] [scrollbar-width:thin]"
            >
              {seasons.map((season) => {
                const current = season.seasonNumber === currentSeasonNumber;
                return (
                  <Link
                    key={season.seasonNumber}
                    href={seasonHref(showId, season.seasonNumber)}
                    aria-current={current ? "page" : undefined}
                    onClick={() => setOpen(false)}
                    className={`flex h-9 w-full items-center justify-center rounded-lg px-3 text-[13px] transition-colors duration-150 ${
                      current
                        ? "bg-accent/20 font-semibold text-accent-hover ring-1 ring-accent/40 ring-inset"
                        : "font-medium text-foreground/85 hover:bg-accent/10 hover:text-foreground"
                    }`}
                  >
                    {formatSeasonLabel(season.seasonNumber)}
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
