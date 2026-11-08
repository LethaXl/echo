"use client";

import { type ReactNode, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { ChevronDownIcon } from "@/components/icons";

export function FilterMenu({
  icon,
  label,
  value,
  active,
  align = "left",
  panelClassName = "",
  size = "md",
  disabled = false,
  ariaLabel,
  tone = "accent",
  triggerClassName = "",
  iconOnly = false,
  className = "",
  floating = false,
  children,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  active: boolean;
  align?: "left" | "right";
  panelClassName?: string;
  size?: "md" | "lg";
  disabled?: boolean;
  ariaLabel?: string;
  tone?: "accent" | "neutral";
  triggerClassName?: string;
  iconOnly?: boolean;
  /** Floats above the mobile dialog without changing its layout or clipping at its edges. */
  floating?: boolean;
  className?: string;
  /** Picking any button inside the panel closes it. */
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!floating || !open) return;
    const panel = panelRef.current;
    const trigger = triggerRef.current;
    if (!panel || !trigger) return;
    // A native top-layer popover can overflow the dialog's scrolling body while
    // remaining its DOM descendant for focus trapping and outside-click handling.
    function position() {
      if (!panel || !trigger) return;
      const bounds = trigger.getBoundingClientRect();
      const viewport = window.visualViewport;
      const top = viewport?.offsetTop ?? 0;
      const bottom = top + (viewport?.height ?? window.innerHeight);
      const gap = 6;
      const below = Math.max(0, bottom - bounds.bottom - gap - 8);
      const above = Math.max(0, bounds.top - top - gap - 8);
      const upwards = below < 160 && above > below;
      panel.style.position = "fixed";
      panel.style.inset = "auto";
      panel.style.margin = "0";
      panel.style.width = `${bounds.width}px`;
      panel.style.maxHeight = `${Math.min(160, upwards ? above : below)}px`;
      panel.style.left = `${Math.max(8, Math.min(bounds.left, window.innerWidth - bounds.width - 8))}px`;
      panel.style.top = `${upwards ? bounds.top - gap - panel.getBoundingClientRect().height : bounds.bottom + gap}px`;
    }
    panel.showPopover();
    position();
    const parentDialog = trigger.closest("dialog");
    const closeWithDialog = () => setOpen(false);
    parentDialog?.addEventListener("close", closeWithDialog);
    window.addEventListener("resize", position);
    window.addEventListener("scroll", position, true);
    window.visualViewport?.addEventListener("resize", position);
    window.visualViewport?.addEventListener("scroll", position);
    return () => {
      parentDialog?.removeEventListener("close", closeWithDialog);
      window.removeEventListener("resize", position);
      window.removeEventListener("scroll", position, true);
      window.visualViewport?.removeEventListener("resize", position);
      window.visualViewport?.removeEventListener("scroll", position);
      if (panel.isConnected && panel.matches(":popover-open")) panel.hidePopover();
    };
  }, [floating, open]);

  useEffect(() => {
    if (!open) return;

    const selected =
      panelRef.current?.querySelector<HTMLElement>('[aria-pressed="true"]') ??
      panelRef.current?.querySelector<HTMLElement>("button");
    selected?.focus({ preventScroll: true });
    // Centres the current choice inside a scrolling list without scrolling the page.
    const list = selected?.parentElement;
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
    <div
      ref={containerRef}
      className={`relative ${className}`}
      onKeyDown={(event) => {
        if (!floating || !open) return;
        if (event.key === "Escape") {
          event.preventDefault();
          event.stopPropagation();
          setOpen(false);
          triggerRef.current?.focus();
          return;
        }
        if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;
        const options = Array.from(panelRef.current?.querySelectorAll<HTMLButtonElement>("button:not(:disabled)") ?? []);
        if (!options.length) return;
        event.preventDefault();
        const current = options.indexOf(document.activeElement as HTMLButtonElement);
        const next = event.key === "Home" ? 0 : event.key === "End" ? options.length - 1
          : (current + (event.key === "ArrowDown" ? 1 : -1) + options.length) % options.length;
        options[next]?.focus();
      }}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
    >
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        aria-label={ariaLabel}
        aria-expanded={open}
        aria-controls={panelId}
        title={iconOnly ? ariaLabel : undefined}
        onClick={() => setOpen((current) => !current)}
        className={iconOnly ? "flex size-7 max-md:size-11 items-center justify-center rounded-sm text-accent transition-colors hover:text-accent-hover disabled:pointer-events-none disabled:opacity-60" : `group flex max-md:h-11 items-center gap-1.5 border whitespace-nowrap transition-colors duration-150 disabled:pointer-events-none disabled:opacity-60 ${size === "lg" ? `h-11 rounded-md text-sm ${tone === "neutral" ? "px-3" : "px-4"}` : tone === "neutral" ? "h-8 rounded-md px-2.5 text-xs" : "h-9 rounded-full pr-3 pl-3.5 text-[13px]"} ${
          tone === "neutral"
            ? `${active ? "border-accent/40" : "border-line"} ${open ? "bg-elevated" : "bg-transparent"} hover:border-muted/60`
            : active
            ? "border-accent/60 bg-accent/10"
            : open
              ? "border-muted/40 bg-elevated"
              : "border-line bg-surface hover:border-muted/40 hover:bg-elevated"
        } ${triggerClassName}`}
      >
        {!iconOnly && icon && <span className={active ? "text-accent" : "text-muted group-hover:text-foreground"}>
          {icon}
        </span>}
        {!iconOnly && label && <span className="text-muted">{label}</span>}
        {!iconOnly && <span className="font-semibold text-foreground">{value}</span>}
        <ChevronDownIcon
          className={`${iconOnly ? "size-4" : "size-3.5"} transition-transform duration-200 motion-reduce:transition-none ${tone === "neutral" && !iconOnly ? "ml-1" : ""} ${open ? "rotate-180" : ""} ${
            active ? "text-accent" : "text-muted"
          }`}
        />
      </button>

      {(open || iconOnly) && (
        <div
          ref={panelRef}
          id={panelId}
          popover={floating ? "manual" : undefined}
          inert={!open}
          aria-hidden={!open}
          className={`${floating ? "fixed m-0 text-foreground" : "absolute top-full"} z-30 mt-1.5 rounded-xl border bg-elevated p-1.5 shadow-2xl shadow-black/60 ${iconOnly ? `origin-top-right transition-[opacity,transform] duration-150 ease-out motion-reduce:transition-none ${open ? "translate-y-0 scale-100 opacity-100" : "pointer-events-none -translate-y-1 scale-95 opacity-0"}` : "motion-safe:animate-menu-in"} ${tone === "neutral" ? "border-line" : "border-accent/35 ring-1 ring-accent/10"} ${
            align === "right" ? "right-0" : "left-0"
          } ${panelClassName}`}
          onClick={(event) => {
            if (!(event.target as HTMLElement).closest("button")) return;
            setOpen(false);
            triggerRef.current?.focus();
          }}
        >
          {children}
        </div>
      )}
    </div>
  );
}

export function MenuOption({
  selected,
  onSelect,
  className = "",
  children,
}: {
  selected: boolean;
  onSelect: () => void;
  className?: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onSelect}
      className={`flex h-9 max-md:h-11 w-full items-center justify-center rounded-lg px-3 text-[13px] transition-colors duration-150 ${
        selected
          ? "bg-accent/20 font-semibold text-accent-hover ring-1 ring-accent/40 ring-inset"
          : "font-medium text-foreground/85 hover:bg-accent/10 hover:text-foreground"
      } ${className}`}
    >
      <span className="truncate">{children}</span>
    </button>
  );
}

