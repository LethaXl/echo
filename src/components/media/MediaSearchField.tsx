"use client";

import { useId, type Ref } from "react";
import { SearchIcon, SpinnerIcon, XIcon } from "@/components/icons";

/** The same search control for public discovery and a user's saved collection. */
export default function MediaSearchField({
  value,
  onChange,
  onClear,
  label,
  placeholder = label,
  inputRef,
  pending = false,
}: {
  value: string;
  onChange: (value: string) => void;
  onClear: () => void;
  label: string;
  placeholder?: string;
  inputRef?: Ref<HTMLInputElement>;
  pending?: boolean;
}) {
  const id = useId();
  return (
    <div className="relative">
      <label htmlFor={id} className="sr-only">{label}</label>
      <span className="pointer-events-none absolute top-1/2 left-3.5 flex -translate-y-1/2 text-muted">
        {pending ? <SpinnerIcon className="size-3.5" /> : <SearchIcon className="size-3.5" />}
      </span>
      <input
        ref={inputRef}
        id={id}
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        autoComplete="off"
        spellCheck={false}
        enterKeyHint="search"
        className="h-9 w-full rounded-full border border-line bg-surface pr-10 pl-9 text-[13px] text-foreground transition-colors placeholder:text-muted/70 hover:border-muted/40 focus:border-accent/70 focus:outline-none [&::-webkit-search-cancel-button]:appearance-none"
      />
      {value && (
        <button
          type="button"
          onClick={onClear}
          aria-label={`Clear ${label.toLowerCase()}`}
          className="absolute top-1/2 right-1.5 flex size-6 -translate-y-1/2 items-center justify-center rounded-full text-muted transition-colors hover:bg-elevated hover:text-foreground"
        >
          <XIcon className="size-3.5" />
        </button>
      )}
    </div>
  );
}
