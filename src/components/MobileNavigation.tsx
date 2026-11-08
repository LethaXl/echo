"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { XIcon } from "@/components/icons";

/** A mobile-only disclosure; desktop navigation remains a separate server-rendered tree. */
export default function MobileNavigation({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    panelRef.current?.querySelector<HTMLAnchorElement>("a")?.focus();

    function onPointerDown(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      setOpen(false);
      buttonRef.current?.focus();
    }
    const desktop = window.matchMedia("(min-width: 48rem)");
    function onViewportChange() {
      if (desktop.matches) setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    desktop.addEventListener("change", onViewportChange);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
      desktop.removeEventListener("change", onViewportChange);
    };
  }, [open]);

  return (
    <div
      ref={containerRef}
      className="relative md:hidden"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
    >
      <button
        ref={buttonRef}
        type="button"
        aria-label={open ? "Close navigation menu" : "Open navigation menu"}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((current) => !current)}
        className="flex size-11 items-center justify-center rounded-md text-foreground transition-colors duration-150 hover:bg-elevated"
      >
        {open ? <XIcon className="size-5" /> : (
          <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="size-5">
            <path d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        )}
      </button>
      <div
        ref={panelRef}
        id={panelId}
        inert={!open}
        aria-hidden={!open}
        className={`absolute top-full right-0 z-40 mt-2 max-h-[calc(100dvh-6rem)] w-[calc(100vw-2rem)] max-w-sm overflow-y-auto overscroll-contain rounded-md border border-line bg-surface p-3 shadow-xl max-md:-right-3 max-md:mt-1.5 max-md:w-[min(9rem,calc(100vw-2rem))] max-md:rounded-lg max-md:p-2 max-md:shadow-lg max-md:shadow-black/20 origin-top-right duration-200 ease-out motion-reduce:transition-none ${
          open ? "visible translate-y-0 scale-100 opacity-100 transition-[opacity,transform]" : "invisible pointer-events-none -translate-y-2 scale-[0.98] opacity-0 transition-[opacity,transform,visibility]"
        }`}
        onClick={(event) => {
          if ((event.target as HTMLElement).closest("a")) {
            setOpen(false);
            buttonRef.current?.focus();
          }
        }}
      >
        {children}
      </div>
    </div>
  );
}
