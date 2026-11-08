"use client";

import Link from "next/link";
import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { ChevronDownIcon } from "@/components/icons";
import { formatSeasonLabel } from "@/lib/format";
import { seasonHref } from "@/lib/media-routes";
import type { SeasonSummary } from "@/types/media";

/** A compact season selector with keyboard and outside-click dismissal. */
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

  useLayoutEffect(() => {
    if (!open) return;
    const list = listRef.current;
    const panel = list?.parentElement;
    const trigger = triggerRef.current;
    if (!list || !panel || !trigger) return;

    function fitMobileMenu() {
      if (!list || !panel || !trigger) return;
      if (window.innerWidth >= 768) {
        list.style.maxHeight = "";
        panel.style.top = "";
        panel.style.bottom = "";
        panel.style.marginTop = "";
        return;
      }
      const bounds = trigger.getBoundingClientRect();
      const viewport = window.visualViewport;
      const top = viewport?.offsetTop ?? 0;
      const bottom = top + (viewport?.height ?? window.innerHeight);
      const frame = panel.offsetHeight - list.offsetHeight;
      const below = Math.max(0, bottom - bounds.bottom - 14 - frame);
      const above = Math.max(0, bounds.top - top - 14 - frame);
      const upwards = below < 176 && above > below;
      list.style.maxHeight = `${Math.max(44, Math.min(288, upwards ? above : below))}px`;
      panel.style.top = upwards ? "auto" : "";
      panel.style.bottom = upwards ? "calc(100% + 6px)" : "";
      panel.style.marginTop = upwards ? "0" : "";
    }

    fitMobileMenu();
    window.addEventListener("resize", fitMobileMenu);
    window.addEventListener("scroll", fitMobileMenu, true);
    window.visualViewport?.addEventListener("resize", fitMobileMenu);
    window.visualViewport?.addEventListener("scroll", fitMobileMenu);
    return () => {
      window.removeEventListener("resize", fitMobileMenu);
      window.removeEventListener("scroll", fitMobileMenu, true);
      window.visualViewport?.removeEventListener("resize", fitMobileMenu);
      window.visualViewport?.removeEventListener("scroll", fitMobileMenu);
      list.style.maxHeight = "";
      panel.style.top = "";
      panel.style.bottom = "";
      panel.style.marginTop = "";
    };
  }, [open]);

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
        className="relative inline-block max-md:max-w-full"
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
          className="flex h-11 max-w-full appearance-none items-center gap-1.5 rounded-none border-0 bg-transparent p-0 text-base whitespace-nowrap shadow-none ring-0 transition-colors duration-150 hover:bg-transparent hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          <span className="text-muted">Season</span>
          <span className="font-semibold text-foreground">
            {currentSeasonNumber === 0 ? "Specials" : currentSeasonNumber}
          </span>
          <ChevronDownIcon
            className={`size-3.5 text-accent transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          />
        </button>

        {open && (
          <div
            id={panelId}
            className="absolute top-full left-0 z-30 mt-1.5 w-40 max-md:max-w-[calc(100vw-2rem)] rounded-xl border border-accent/35 bg-elevated p-1.5 shadow-2xl shadow-black/60 ring-1 ring-accent/10 motion-safe:animate-menu-in"
          >
            <div
              ref={listRef}
              className="relative -mr-1 max-h-72 max-md:max-h-[min(50dvh,18rem)] overflow-y-auto overscroll-contain pr-1 [scrollbar-color:color-mix(in_srgb,var(--color-accent)_45%,transparent)_transparent] [scrollbar-width:thin]"
            >
              {seasons.map((season) => {
                const current = season.seasonNumber === currentSeasonNumber;
                return (
                  <Link
                    key={season.seasonNumber}
                    href={seasonHref(showId, season.seasonNumber)}
                    aria-current={current ? "page" : undefined}
                    onClick={() => setOpen(false)}
                    className={`flex h-9 max-md:h-11 w-full items-center justify-center rounded-lg px-3 text-[13px] transition-colors duration-150 ${
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
