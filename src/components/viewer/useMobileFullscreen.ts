"use client";

import { useCallback, useEffect, useRef, useState, type RefObject } from "react";

type LockableOrientation = ScreenOrientation & {
  lock?: (orientation: "landscape") => Promise<void>;
};

/** Native fullscreen only: one automatic attempt per title, then explicit user gestures. */
export default function useMobileFullscreen(containerRef: RefObject<HTMLDivElement | null>, contentKey: string) {
  const [message, setMessage] = useState<string | null>(null);
  const mounted = useRef(false);
  const attemptedKey = useRef<string | null>(null);
  const requesting = useRef(false);
  const mobileSession = useRef(false);
  const orientationAttempted = useRef(false);
  const orientationLocked = useRef(false);

  const enter = useCallback(async (manual: boolean) => {
    const container = containerRef.current;
    if (!container || requesting.current || document.fullscreenElement) return;
    if (!document.fullscreenEnabled || typeof container.requestFullscreen !== "function") {
      if (mounted.current) setMessage("Fullscreen isn't available in this browser. You can watch here.");
      return;
    }
    mobileSession.current = true;
    requesting.current = true;
    try {
      await container.requestFullscreen();
      if (!mounted.current) {
        if (document.fullscreenElement === container) await document.exitFullscreen();
        return;
      }
      setMessage(null);
    } catch {
      if (mounted.current) {
        setMessage(manual ? "Fullscreen was blocked. You can keep watching here." : "Tap Full screen to expand the viewer.");
      }
    } finally {
      requesting.current = false;
    }
  }, [containerRef]);

  useEffect(() => {
    mounted.current = true;
    const container = containerRef.current;
    const orientation = window.screen.orientation as LockableOrientation | undefined;

    function releaseOrientation() {
      orientationAttempted.current = false;
      if (!orientationLocked.current) return;
      orientationLocked.current = false;
      try { orientation?.unlock(); } catch { /* Orientation control is optional. */ }
    }

    function onFullscreenChange() {
      if (document.fullscreenElement !== container) {
        releaseOrientation();
        return;
      }
      if (!mobileSession.current || orientationAttempted.current || typeof orientation?.lock !== "function") return;
      orientationAttempted.current = true;
      // Browsers may allow this only after native fullscreen has been entered.
      try {
        void orientation.lock("landscape").then(() => {
          if (mounted.current && document.fullscreenElement === container) {
            orientationLocked.current = true;
          } else if (!document.fullscreenElement) {
            try { orientation.unlock(); } catch { /* Nothing to restore on unsupported browsers. */ }
          }
        }).catch(() => {});
      } catch { /* A browser may expose the API without allowing orientation changes. */ }
    }

    function exitOwnedFullscreen() {
      releaseOrientation();
      if (mobileSession.current && document.fullscreenElement === container) {
        void document.exitFullscreen().catch(() => {});
      }
    }

    document.addEventListener("fullscreenchange", onFullscreenChange);
    window.addEventListener("pagehide", exitOwnedFullscreen);
    if (
      window.matchMedia("(width < 768px)").matches &&
      document.visibilityState === "visible" &&
      attemptedKey.current !== contentKey
    ) {
      attemptedKey.current = contentKey;
      void enter(false);
    }

    return () => {
      mounted.current = false;
      document.removeEventListener("fullscreenchange", onFullscreenChange);
      window.removeEventListener("pagehide", exitOwnedFullscreen);
      exitOwnedFullscreen();
    };
  }, [containerRef, contentKey, enter]);

  async function toggle() {
    if (document.fullscreenElement === containerRef.current) {
      try { await document.exitFullscreen(); } catch { /* The normal viewer stays available. */ }
    } else {
      await enter(true);
    }
  }

  return { message, toggle };
}
