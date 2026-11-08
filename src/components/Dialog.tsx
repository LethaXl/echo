"use client";

import Image from "next/image";
import styles from "./Dialog.module.css";
import {
  createContext,
  use,
  useEffect,
  useRef,
  type ComponentProps,
  type ReactNode,
} from "react";

const CloseContext = createContext<(force?: boolean) => void>(() => {});

type DialogProps = {
  labelledBy: string;
  /** While true (e.g. a change is being saved), Escape, backdrop clicks and close buttons do nothing. */
  busy: boolean;
  /**
   * Asked before Escape, a backdrop click or a close button closes the dialog; returning false
   * keeps it open (e.g. to confirm discarding unsaved changes).
   */
  canClose?: () => boolean;
  /**
   * `panel` and `compact-panel` lay their children out as a column, so they can keep a fixed
   * header and footer around a scrolling body; `panel` is wider.
   */
  size?: "md" | "panel" | "compact-panel";
  /** Opt into viewport-aware mobile sizing without changing existing detail dialogs. */
  mobileOptimized?: boolean;
  onClose: () => void;
  children: ReactNode;
};

const SIZE_CLASS_NAMES = {
  md: "max-w-md overflow-y-auto p-6",
  panel: "max-w-xl flex-col overflow-hidden open:flex",
  "compact-panel": "max-w-[28rem] flex-col overflow-hidden open:flex",
};

/**
 * A modal that opens as soon as it mounts. Focus starts on the element marked `data-autofocus`,
 * or else the first input.
 */
export default function Dialog({ labelledBy, busy, canClose, size = "md", mobileOptimized = false, onClose, children }: DialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (!mobileOptimized) return;
    const dialog = dialogRef.current;
    if (!dialog) return;
    const viewport = window.visualViewport;
    function fitMobileViewport() {
      if (!dialog) return;
      if (window.innerWidth >= 768) {
        dialog.style.removeProperty("--dialog-viewport-height");
        dialog.style.removeProperty("--dialog-viewport-top");
        return;
      }
      dialog.style.setProperty("--dialog-viewport-height", `${viewport?.height ?? window.innerHeight}px`);
      dialog.style.setProperty("--dialog-viewport-top", `${viewport?.offsetTop ?? 0}px`);
    }
    fitMobileViewport();
    window.addEventListener("resize", fitMobileViewport);
    viewport?.addEventListener("resize", fitMobileViewport);
    viewport?.addEventListener("scroll", fitMobileViewport);
    return () => {
      window.removeEventListener("resize", fitMobileViewport);
      viewport?.removeEventListener("resize", fitMobileViewport);
      viewport?.removeEventListener("scroll", fitMobileViewport);
      dialog.style.removeProperty("--dialog-viewport-height");
      dialog.style.removeProperty("--dialog-viewport-top");
    };
  }, [mobileOptimized]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog || dialog.open) return;
    dialog.showModal();
    (
      dialog.querySelector<HTMLElement>("[data-autofocus]") ?? dialog.querySelector("input")
    )?.focus();
  }, []);

  /** `force` skips `canClose`, for closing after the user has already confirmed. */
  function close(force = false) {
    if (busy || (!force && canClose && !canClose())) return;
    dialogRef.current?.close();
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={labelledBy}
      onClose={onClose}
      onKeyDown={(event) => {
        // Browsers can skip a cancelled `cancel` event on a repeated Escape, so Escape is
        // handled here when the dialog needs a say in closing.
        if (canClose && event.key === "Escape") {
          event.preventDefault();
          close();
        }
      }}
      onCancel={(event) => {
        if (busy || (canClose && !canClose())) event.preventDefault();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) close();
      }}
      className={`m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] rounded-xl border border-line bg-surface text-foreground shadow-2xl shadow-black/60 backdrop:bg-black/70 motion-safe:animate-fade-in-up ${SIZE_CLASS_NAMES[size]} ${mobileOptimized ? `${styles.dialog} ${size === "md" ? "max-md:p-4" : ""}` : ""}`}
    >
      <CloseContext value={close}>{children}</CloseContext>
    </dialog>
  );
}

/** Closes the surrounding dialog; pass `true` to skip its `canClose` check. */
export function useDialogClose() {
  return use(CloseContext);
}

export function DialogCloseButton(props: Omit<ComponentProps<"button">, "type" | "onClick">) {
  const close = use(CloseContext);
  return <button type="button" onClick={() => close()} {...props} />;
}

export function DialogLogo() {
  return <Image src="/echo-logo.png" alt="" width={447} height={160} className="h-9 w-auto" />;
}

export function DialogHeader({
  titleId,
  mark,
  title,
  children,
}: {
  titleId: string;
  mark?: ReactNode;
  title: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center text-center">
      {mark && <div className="mb-4">{mark}</div>}
      <h2 id={titleId} className="text-xl font-semibold tracking-tight">
        {title}
      </h2>
      <p className="mt-1 text-sm text-muted">{children}</p>
    </div>
  );
}

/** A label/value row; render inside a `<dl>`. */
export function DialogRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2.5 max-md:flex-col max-md:items-start max-md:gap-1">
      <dt className="text-muted">{label}</dt>
      <dd className="min-w-0 text-right max-md:text-left max-md:[overflow-wrap:anywhere]">{children}</dd>
    </div>
  );
}

/** Summary rows in Echo's green, e.g. what's being bought. */
export function DialogSummary({ children }: { children: ReactNode }) {
  return (
    <dl className="mt-5 divide-y divide-line rounded-lg border border-accent/25 bg-accent/5 px-4 text-sm">
      {children}
    </dl>
  );
}
