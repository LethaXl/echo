"use client";

import { useId, useState, type ReactNode } from "react";
import { ChevronDownIcon } from "@/components/icons";

export default function EpisodeDescription({
  children,
  overview,
  episodeNumber,
}: {
  children: ReactNode;
  overview: string;
  episodeNumber: number;
}) {
  const [open, setOpen] = useState(false);
  const descriptionId = useId();

  return (
    <>
      <div className="contents max-md:col-start-2 max-md:row-start-1 max-md:flex max-md:min-w-0 max-md:items-center max-md:gap-1">
        <div className="contents max-md:block max-md:min-w-0 max-md:flex-1">
          {children}
        </div>
        <button
          type="button"
          aria-expanded={open}
          aria-controls={descriptionId}
          aria-label={`${open ? "Hide" : "Show"} description for episode ${episodeNumber}`}
          onClick={() => setOpen((current) => !current)}
          className="hidden size-11 shrink-0 items-center justify-center rounded-sm text-accent focus-visible:outline-2 focus-visible:outline-accent max-md:inline-flex"
        >
          <ChevronDownIcon className={`size-4 transition-transform duration-250 motion-reduce:transition-none ${open ? "rotate-180" : ""}`} />
        </button>
      </div>
      <p className="mt-3 line-clamp-3 text-[0.9375rem] leading-relaxed text-foreground/75 max-md:hidden">
        {overview}
      </p>
      <div
        id={descriptionId}
        aria-hidden={!open}
        inert={!open}
        className={`hidden max-md:col-span-2 max-md:grid transition-[grid-template-rows,opacity] duration-250 ease-in-out motion-reduce:transition-none ${open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}
      >
        <div className="min-h-0 overflow-hidden">
          <p className="text-sm leading-relaxed text-foreground/75">{overview}</p>
        </div>
      </div>
    </>
  );
}
