"use client";

import { createContext, useContext } from "react";
import { AlertCircleIcon } from "@/components/icons";

export type FieldErrorPlacement = "side" | "below";

/** "side" needs free space to the right of the form; use "below" inside wider layouts. */
export const FieldErrorPlacementContext = createContext<FieldErrorPlacement>("side");

const placementClassNames: Record<FieldErrorPlacement, { popover: string; caret: string }> = {
  side: {
    popover:
      "top-1/2 left-full ml-3 -translate-y-1/2 max-[56rem]:top-full max-[56rem]:right-0 max-[56rem]:left-auto max-[56rem]:mt-2 max-[56rem]:ml-0 max-[56rem]:translate-y-0",
    caret: "top-1/2 -left-[5px] -translate-y-1/2 border-b border-l max-[56rem]:hidden",
  },
  below: {
    popover: "top-full right-0 mt-2",
    caret: "-top-[5px] right-4 border-t border-l",
  },
};

export function fieldErrorId(name: string): string {
  return `${name}-error`;
}

export default function FieldErrorPopover({ name, message }: { name: string; message: string }) {
  const placement = placementClassNames[useContext(FieldErrorPlacementContext)];

  return (
    <div
      id={fieldErrorId(name)}
      role="alert"
      className={`pointer-events-none absolute z-20 w-max max-w-60 motion-safe:animate-pop-in ${placement.popover} max-md:static max-md:mt-2 max-md:ml-0 max-md:w-full max-md:max-w-none max-md:translate-y-0 max-md:[overflow-wrap:anywhere]`}
    >
      <div className="relative flex items-start gap-2 rounded-md border border-danger/40 bg-elevated px-3 py-2 text-xs leading-snug text-foreground shadow-lg shadow-black/30">
        <span
          aria-hidden="true"
          className={`absolute size-2.5 rotate-45 border-danger/40 bg-elevated ${placement.caret} max-md:hidden`}
        />
        <AlertCircleIcon className="mt-px size-3.5 shrink-0 text-danger" />
        <span>{message}</span>
      </div>
    </div>
  );
}
