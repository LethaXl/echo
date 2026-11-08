"use client";

import { ClapperboardIcon, LayersIcon, TvIcon } from "@/components/icons";
import type { ContentType } from "@/lib/browse";

const TYPES: { value: ContentType; label: string; Icon: typeof TvIcon }[] = [
  { value: "all", label: "All", Icon: LayersIcon },
  { value: "movie", label: "Movies", Icon: ClapperboardIcon },
  { value: "tv", label: "TV shows", Icon: TvIcon },
];

export function ContentTypeToggle({
  value,
  onChange,
  className = "",
}: {
  value: ContentType;
  onChange: (type: ContentType) => void;
  className?: string;
}) {
  const index = TYPES.findIndex((option) => option.value === value);

  return (
    <div
      role="radiogroup"
      aria-label="Content type"
      className={`relative grid h-9 grid-cols-3 max-md:order-1 max-md:h-11 max-md:w-full max-md:min-w-0 rounded-full border border-accent/30 bg-accent/10 p-[3px] ${className}`}
    >
      <span
        aria-hidden="true"
        className="absolute inset-y-[3px] left-[3px] w-[calc((100%-6px)/3)] rounded-full bg-accent shadow-[0_2px_10px_-2px] shadow-accent/50 max-md:shadow-none transition-transform duration-300 ease-out"
        style={{ transform: `translateX(${index * 100}%)` }}
      />
      {TYPES.map(({ value: option, label, Icon }) => {
        const checked = option === value;
        return (
          <button
            key={option}
            type="button"
            role="radio"
            aria-checked={checked}
            onClick={() => onChange(option)}
            className={`relative z-10 flex w-[7rem] max-md:w-auto max-md:min-w-0 max-md:gap-1 max-md:text-xs items-center justify-center gap-1.5 rounded-full text-[13px] font-semibold transition-colors duration-200 ${
              checked ? "text-on-accent" : "text-muted hover:text-foreground"
            }`}
          >
            <Icon className="size-3.5 max-md:hidden" />
            {label}
          </button>
        );
      })}
    </div>
  );
}

