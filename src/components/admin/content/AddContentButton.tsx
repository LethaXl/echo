"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useId, useRef, useState } from "react";
import { buttonClassName } from "@/components/ButtonLink";
import Dialog, { DialogCloseButton, DialogHeader } from "@/components/Dialog";
import TmdbImage from "@/components/details/TmdbImage";
import FormMessage from "@/components/forms/FormMessage";
import SubmitButton from "@/components/forms/SubmitButton";
import { inputClassName } from "@/components/forms/TextField";
import { FilmIcon, SpinnerIcon } from "@/components/icons";
import {
  addTmdbContent,
  previewTmdbContent,
  type AddContentPreview,
  type ContentActionState,
} from "@/lib/admin/content-actions";
import { initialFormState } from "@/lib/auth/form-state";
import { parseTmdbUrl } from "@/lib/content/tmdb-url";

const LOOKUP_DELAY_MS = 300;

type Lookup =
  | { status: "idle" }
  | { status: "loading"; url: string }
  | { status: "error"; url: string; message: string }
  | { status: "ready"; url: string; preview: AddContentPreview };

// US-50 Add a Movie, US-51 Add a TV Show, US-54 Add a Show Season, US-55 Add an Episode
export default function AddContentButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  function handleClose(added: boolean) {
    setOpen(false);
    if (added) router.refresh();
  }

  return (
    <>
      <button
        type="button"
        aria-haspopup="dialog"
        onClick={() => setOpen(true)}
        className="inline-flex h-9 shrink-0 items-center justify-center rounded-full bg-accent px-4 text-[13px] font-medium text-on-accent transition-colors duration-150 hover:bg-accent-hover active:translate-y-px"
      >
        Add Content
      </button>
      {open && <AddContentDialog onClose={handleClose} />}
    </>
  );
}

function AddContentDialog({ onClose }: { onClose: (added: boolean) => void }) {
  const titleId = useId();
  const inputId = useId();
  const [state, formAction, pending] = useActionState<ContentActionState, FormData>(addTmdbContent, initialFormState);
  const [value, setValue] = useState("");
  const [lookup, setLookup] = useState<Lookup>({ status: "idle" });
  const latestLookup = useRef(0);
  const succeeded = state.status === "success";
  const url = value.trim();

  useEffect(() => {
    if (!url) return;
    const timer = setTimeout(async () => {
      const parsed = parseTmdbUrl(url);
      if (!parsed.ok) {
        setLookup({ status: "error", url, message: parsed.message });
        return;
      }
      const request = ++latestLookup.current;
      setLookup({ status: "loading", url });
      const result = await previewTmdbContent(url).catch(() => ({
        ok: false as const,
        message: "That link couldn't be checked. Try again in a moment.",
      }));
      // Only the lookup for what's in the field now may show.
      if (request !== latestLookup.current) return;
      setLookup(
        result.ok ? { status: "ready", url, preview: result.preview } : { status: "error", url, message: result.message },
      );
    }, LOOKUP_DELAY_MS);
    return () => clearTimeout(timer);
  }, [url]);

  function handleChange(nextValue: string) {
    setValue(nextValue);
    latestLookup.current += 1;
    setLookup({ status: "idle" });
  }

  const preview = lookup.status === "ready" && lookup.url === url ? lookup.preview : null;
  const lookupError = lookup.status === "error" && lookup.url === url ? lookup.message : null;

  return (
    <Dialog labelledBy={titleId} busy={pending} onClose={() => onClose(succeeded)}>
      {succeeded ? (
        <div role="status">
          <DialogHeader titleId={titleId} title={state.title ?? "Added"}>
            {state.message}
          </DialogHeader>
          <div className={`mt-6 grid gap-3 ${preview ? "grid-cols-2" : ""}`}>
            {preview && (
              <Link href={preview.manageHref} className={`${buttonClassName("secondary")} w-full`}>
                Manage
              </Link>
            )}
            <DialogCloseButton autoFocus className={`${buttonClassName("primary")} w-full`}>
              Done
            </DialogCloseButton>
          </div>
        </div>
      ) : (
        <>
          <DialogHeader titleId={titleId} title="Add Content">
            Paste a TMDB link to a movie, TV show, season or episode.
          </DialogHeader>
          <form action={formAction} className="mt-5 flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor={inputId} className="sr-only">
                TMDB link
              </label>
              <input
                id={inputId}
                name="url"
                type="url"
                inputMode="url"
                autoComplete="off"
                spellCheck={false}
                value={value}
                onChange={(event) => handleChange(event.target.value)}
                placeholder="https://www.themoviedb.org/tv/1396"
                maxLength={500}
                aria-invalid={lookupError ? true : undefined}
                aria-describedby={`${inputId}-hint`}
                className={inputClassName}
              />
              <p id={`${inputId}-hint`} className={`text-xs ${lookupError ? "text-danger" : "text-muted"}`}>
                {lookupError ?? "For example …/movie/157336, …/tv/1396/season/1 or …/season/1/episode/1."}
              </p>
            </div>

            {lookup.status === "loading" && lookup.url === url && (
              <div role="status" className="flex items-center gap-2.5 rounded-lg border border-line px-3 py-4 text-sm text-muted">
                <SpinnerIcon className="size-4" />
                Looking it up on TMDB…
              </div>
            )}
            {preview && <PreviewCard preview={preview} />}

            {state.status === "error" && <FormMessage state={state} />}
            <div className="grid grid-cols-2 gap-3">
              <DialogCloseButton disabled={pending} className={`${buttonClassName("secondary")} w-full`}>
                Cancel
              </DialogCloseButton>
              <SubmitButton size="md" pendingLabel="Adding" disabled={!preview || preview.alreadyAdded}>
                {preview?.alreadyAdded ? "Already added" : "Confirm Add"}
              </SubmitButton>
            </div>
          </form>
        </>
      )}
    </Dialog>
  );
}

function PreviewCard({ preview }: { preview: AddContentPreview }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-line bg-background/40 p-3">
      <TmdbImage
        path={preview.imagePath}
        size={preview.wideImage ? "w300" : "w185"}
        sizes={preview.wideImage ? "6rem" : "3rem"}
        className={`shrink-0 ring-1 ring-line ${preview.wideImage ? "aspect-video w-24" : "aspect-[2/3] w-12"}`}
        fallback={<FilmIcon className="size-4" />}
      />
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-semibold tracking-wide text-accent uppercase">{preview.kindLabel}</p>
        <p className="mt-0.5 truncate text-sm font-medium">{preview.title}</p>
        <p className="mt-0.5 truncate text-xs text-muted">{preview.details}</p>
        {preview.alreadyAdded && (
          <p className="mt-1.5 text-xs text-muted">
            Already added.{" "}
            <Link href={preview.manageHref} className="text-foreground underline-offset-2 hover:underline">
              Manage it
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}
