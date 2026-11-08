"use client";

import { useCallback, useEffect, useRef, useState, type RefObject } from "react";

const IDLE_MS = 3000;

/** Hide playback chrome while idle, without hiding controls from keyboard navigation. */
export default function useAutoHideControls(containerRef: RefObject<HTMLDivElement | null>, playing: boolean) {
  const [idle, setIdle] = useState(false);
  const wakeTap = useRef(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    let timer: number;
    let hidden = false;
    let pointerDown = false;

    function reveal() {
      hidden = false;
      setIdle(false);
      window.clearTimeout(timer);
      if (!playing) return;
      timer = window.setTimeout(() => {
        // Never disappear during a drag or while a keyboard user operates a control.
        if (pointerDown || container?.querySelector(":focus-visible")) return;
        hidden = true;
        setIdle(true);
      }, IDLE_MS);
    }

    function onPointerDown(event: PointerEvent) {
      // The first tap wakes the picture; the next tap can pause it.
      wakeTap.current = hidden && event.pointerType === "touch";
      pointerDown = true;
      reveal();
    }

    function onPointerUp() {
      if (!pointerDown) return;
      pointerDown = false;
      reveal();
    }

    timer = window.setTimeout(reveal, 0);
    container.addEventListener("pointermove", reveal);
    container.addEventListener("pointerdown", onPointerDown, true);
    container.addEventListener("keydown", reveal, true);
    container.addEventListener("focusin", reveal);
    container.addEventListener("focusout", reveal);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerUp);
    document.addEventListener("fullscreenchange", reveal);

    return () => {
      window.clearTimeout(timer);
      container.removeEventListener("pointermove", reveal);
      container.removeEventListener("pointerdown", onPointerDown, true);
      container.removeEventListener("keydown", reveal, true);
      container.removeEventListener("focusin", reveal);
      container.removeEventListener("focusout", reveal);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerUp);
      document.removeEventListener("fullscreenchange", reveal);
    };
  }, [containerRef, playing]);

  const consumeWakeTap = useCallback(() => {
    const consumed = wakeTap.current;
    wakeTap.current = false;
    return consumed;
  }, []);

  return { hidden: playing && idle, consumeWakeTap };
}
