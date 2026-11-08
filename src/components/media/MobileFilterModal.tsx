"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import styles from "./MobileFilterModal.module.css";

/** Mobile presentation and draft lifecycle only; callers retain their existing filter logic. */
export default function MobileFilterModal<T extends object>({ title, value, defaults, count, onApply, children }: {
  title: string;
  value: T;
  defaults: T;
  count: number;
  onApply: (value: T) => void;
  children: (draft: T, update: (value: T) => void) => ReactNode;
}) {
  const id = useId();
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const appliedKey = JSON.stringify(value);
  const [selection, setSelection] = useState({ appliedKey, draft: value });
  // Back/Forward and desktop changes supersede a stale draft. Dismissal alone keeps it.
  if (selection.appliedKey !== appliedKey) setSelection({ appliedKey, draft: value });
  const draft = selection.appliedKey === appliedKey ? selection.draft : value;
  const pending = JSON.stringify(draft) !== appliedKey;

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const desktop = window.matchMedia("(min-width: 768px)");
    const onResize = () => { if (desktop.matches) dialog.current?.close(); };
    desktop.addEventListener("change", onResize);
    return () => {
      document.body.style.overflow = previous;
      desktop.removeEventListener("change", onResize);
    };
  }, [open]);

  return (
    <div className="absolute top-0 right-0 md:hidden">
      <button ref={trigger} type="button" aria-haspopup="dialog" aria-expanded={open}
        aria-controls={id} aria-label={`${title}${count ? `, ${count} active filters` : ""}`}
        onClick={() => { dialog.current?.showModal(); setOpen(true); }}
        title="Filters"
        className={`flex h-11 min-w-11 items-center justify-center gap-1.5 rounded-r-full border-l px-3 text-sm font-medium transition-colors ${count ? "border-accent/50 bg-accent/10 text-accent" : "border-line bg-transparent text-muted hover:text-accent"}`}>
        <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" className="size-4">
          <path d="M4 7h5m4 0h7M4 17h9m4 0h3" /><circle cx="11" cy="7" r="2" /><circle cx="15" cy="17" r="2" />
        </svg>
        <span className="sr-only">Filters</span>
        {count > 0 && <span className="text-xs font-semibold tabular-nums">{count}</span>}
      </button>
      <dialog ref={dialog} id={id} aria-labelledby={`${id}-title`}
        className={styles.sheet}
        onClose={() => { setOpen(false); trigger.current?.focus({ preventScroll: true }); }}
        onKeyDown={(event) => {
          if (event.key !== "Tab") return;
          const controls = event.currentTarget.querySelectorAll<HTMLElement>("button:not(:disabled)");
          const first = controls[0];
          const last = controls[controls.length - 1];
          if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last?.focus();
          } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first?.focus();
          }
        }}
        onClick={(event) => {
          if (event.target !== event.currentTarget) return;
          const bounds = event.currentTarget.getBoundingClientRect();
          if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) dialog.current?.close();
        }}>
        <div className="shrink-0 border-b border-line px-5 py-4 text-center">
          <h2 id={`${id}-title`} className="text-lg font-semibold tracking-tight">{title}</h2>
        </div>
        <div className="min-h-0 overflow-y-auto overscroll-contain px-5 py-5 [scrollbar-width:thin] [scrollbar-color:var(--color-accent)_var(--color-surface)]">
          {children(draft, (next) => setSelection({ appliedKey, draft: next }))}
        </div>
        <div className="shrink-0 border-t border-line px-5 py-4">
          <div className="grid grid-cols-2 gap-3">
            <button type="button" onClick={() => setSelection({ appliedKey, draft: defaults })}
              className="h-11 rounded-md border border-line text-sm font-medium text-muted transition-colors hover:bg-elevated">Reset</button>
            <button type="button" onClick={() => { if (pending) onApply(draft); dialog.current?.close(); }}
              className="h-11 rounded-md bg-accent text-sm font-semibold text-on-accent transition-colors hover:bg-accent-hover">Show results</button>
          </div>
        </div>
      </dialog>
    </div>
  );
}
