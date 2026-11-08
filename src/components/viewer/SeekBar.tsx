"use client";

import { useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { describePlaybackTime } from "@/lib/viewer/time";

const SMALL_STEP = 10;
const LARGE_STEP = 60;

type SeekBarProps = {
  position: number;
  duration: number;
  onSeek: (seconds: number) => void;
};

/** Click, drag or use the arrow keys (10s), Page Up/Down (1 min), Home and End to seek. */
export default function SeekBar({ position, duration, onSeek }: SeekBarProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);
  const percent = duration > 0 ? Math.min(100, (position / duration) * 100) : 0;

  function seekToPointer(event: PointerEvent<HTMLDivElement>) {
    const track = trackRef.current;
    if (!track) return;
    const { left, width } = track.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (event.clientX - left) / width));
    onSeek(ratio * duration);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const targets: Record<string, number> = {
      ArrowRight: position + SMALL_STEP,
      ArrowUp: position + SMALL_STEP,
      ArrowLeft: position - SMALL_STEP,
      ArrowDown: position - SMALL_STEP,
      PageUp: position + LARGE_STEP,
      PageDown: position - LARGE_STEP,
      Home: 0,
      End: duration,
    };
    const target = targets[event.key];
    if (target === undefined) return;
    event.preventDefault();
    event.stopPropagation();
    onSeek(target);
  }

  return (
    <div
      role="slider"
      tabIndex={0}
      aria-label="Seek"
      aria-valuemin={0}
      aria-valuemax={duration}
      aria-valuenow={position}
      aria-valuetext={`${describePlaybackTime(position)} of ${describePlaybackTime(duration)}`}
      onKeyDown={handleKeyDown}
      onPointerDown={(event) => {
        if (event.button !== 0) return;
        event.currentTarget.setPointerCapture(event.pointerId);
        setDragging(true);
        seekToPointer(event);
      }}
      onPointerMove={(event) => {
        if (dragging) seekToPointer(event);
      }}
      onPointerUp={() => setDragging(false)}
      onPointerCancel={() => setDragging(false)}
      className="group/seek flex h-5 cursor-pointer touch-none items-center rounded-sm focus-visible:outline-offset-4 max-md:h-11"
    >
      <div
        ref={trackRef}
        className={`relative w-full rounded-full bg-foreground/25 motion-safe:transition-[height] ${
          dragging ? "h-1.5" : "h-1 group-hover/seek:h-1.5 group-focus-visible/seek:h-1.5"
        }`}
      >
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-accent"
          style={{ width: `${percent}%` }}
        />
        <div
          aria-hidden="true"
          className={`absolute top-1/2 size-3.5 -translate-1/2 rounded-full bg-foreground motion-safe:transition-transform ${
            dragging ? "scale-110" : "scale-90 group-hover/seek:scale-100"
          }`}
          style={{ left: `${percent}%` }}
        />
      </div>
    </div>
  );
}
