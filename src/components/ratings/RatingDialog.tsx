"use client";

import { useId, useRef, useState } from "react";
import { buttonClassName } from "@/components/ButtonLink";
import Dialog, { DialogCloseButton } from "@/components/Dialog";
import { EchoWaveIcon, FilmIcon, XIcon } from "@/components/icons";
import TmdbImage from "@/components/details/TmdbImage";
import { MEDIA_TYPES } from "@/components/media/media-types";
import EchoWaveRating from "./EchoWaveRating";
import EchoWaveSymbol from "./EchoWaveSymbol";
import type { RatingValue } from "@/lib/ratings/model";
import type { CatalogueItem } from "@/types/media";

export default function RatingDialog({ item, rating, compact = false }: {
  item: CatalogueItem;
  rating: RatingValue | null;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const titleId = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  const mediaType = MEDIA_TYPES[item.mediaType];

  function close() {
    setOpen(false);
    trigger.current?.focus();
  }

  return (
    <>
      <button ref={trigger} type="button" onClick={() => setOpen(true)} aria-haspopup="dialog" aria-expanded={open}
        aria-label={`Rate ${item.title}${rating === null ? "" : `, currently ${rating} out of 5`}`}
        className={compact ? "flex h-9 max-md:h-11 max-md:min-w-11 items-center justify-center gap-1.5 rounded-md px-1.5 text-accent transition-colors hover:bg-elevated hover:text-accent-hover" : buttonClassName("secondary", "lg")}>
        {compact && rating !== null ? <>
          <EchoWaveSymbol level={rating} className="h-6 w-5" />
          <span className="text-sm leading-none font-semibold tabular-nums">{rating}</span>
        </> : <><EchoWaveIcon className="size-4 text-accent" />Rate</>}
      </button>
      {open && (
        <Dialog labelledBy={titleId} busy={busy} onClose={close}>
          <div className="flex items-center justify-between gap-4">
            <h2 id={titleId} className="sr-only">Rate {item.title}</h2>
            <DialogCloseButton disabled={busy} aria-label="Close rating dialog"
              className="flex size-8 items-center justify-center rounded-full text-muted transition-colors hover:bg-elevated hover:text-foreground disabled:opacity-40">
              <XIcon className="size-4" />
            </DialogCloseButton>
          </div>
          <div className="mt-4 flex flex-col items-center text-center">
            <TmdbImage path={item.posterPath} size="w342" sizes="144px"
              className="aspect-[2/3] w-36 ring-1 ring-line shadow-xl shadow-black/30"
              fallback={<FilmIcon className="size-8" />} />
            <h3 className="mt-4 text-xl font-semibold tracking-tight text-balance">{item.title}</h3>
            <p className="mt-1 flex items-center justify-center gap-2 text-xs text-muted">
              {item.year && <><span>{item.year}</span><span aria-hidden="true">·</span></>}
              <mediaType.Icon className="size-3.5" />{mediaType.label}
            </p>
          </div>
          <div className="mt-6 border-t border-line pt-5">
            <p className="mb-4 text-center text-sm text-muted">How strongly did it resonate?</p>
            <EchoWaveRating item={item} rating={rating} onPendingChange={setBusy} />
          </div>
        </Dialog>
      )}
    </>
  );
}
