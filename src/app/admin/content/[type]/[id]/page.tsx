import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ButtonLink from "@/components/ButtonLink";
import ConfirmActionButton from "@/components/admin/content/ConfirmActionButton";
import ContentStatusLabel from "@/components/admin/content/ContentStatusLabel";
import EditContentButton from "@/components/admin/content/EditContentButton";
import ShowSeasons from "@/components/admin/content/ShowSeasons";
import { contentListHref } from "@/components/admin/content/hrefs";
import { ERROR_NOTE } from "@/components/admin/content/styles";
import DetailsBackLink from "@/components/details/DetailsBackLink";
import TmdbImage from "@/components/details/TmdbImage";
import { FilmIcon } from "@/components/icons";
import { requireAdmin } from "@/lib/admin/access";
import { saveTitleDetails, setTitleHidden } from "@/lib/admin/content-actions";
import { editFields, getManagedTitle, titleTmdbValues } from "@/lib/admin/content-queries";
import { TITLE_FIELDS } from "@/lib/content/overrides";
import { applyMovieOverrides, applyTvOverrides } from "@/lib/content/rules";
import { parseRouteNumber, titleHref } from "@/lib/media-routes";
import { getTmdbMovieDetails, getTmdbTvShowDetails } from "@/lib/tmdb/details";

export const metadata: Metadata = {
  title: "Manage Content",
  robots: { index: false, follow: false },
};

type AdminTitlePageProps = PageProps<"/admin/content/[type]/[id]">;

function Alert({ children }: { children: string }) {
  return (
    <p role="alert" className={`mt-6 ${ERROR_NOTE}`}>
      {children}
    </p>
  );
}

const STATUS_NOTES = {
  unmanaged: "Shown on Echo with TMDB's details.",
  managed: "Shown on Echo. Fields you haven't edited keep following TMDB.",
  hidden: "Hidden from Echo. Viewers can't find, watch, save or rate it.",
} as const;

// US-50 to US-57: edit, hide and restore one title, and a show's seasons and episodes
export default async function AdminTitlePage({ params }: AdminTitlePageProps) {
  const { type, id } = await params;
  const mediaType = type === "movie" || type === "tv" ? type : null;
  const tmdbId = parseRouteNumber(id);
  if (!mediaType || !tmdbId) notFound();
  await requireAdmin(`/admin/content/${mediaType}/${tmdbId}`);

  const backHref = contentListHref();
  const noun = mediaType === "movie" ? "movie" : "show";
  const [loaded, managed] = await Promise.all([
    (mediaType === "movie" ? getTmdbMovieDetails(tmdbId) : getTmdbTvShowDetails(tmdbId)).catch(() => undefined),
    getManagedTitle(mediaType, tmdbId),
  ]);
  const tmdbUnavailable = loaded === undefined;
  const details = loaded ?? null;

  const back = <DetailsBackLink href={backHref} label="Back to Content Management" />;
  if (managed === undefined) {
    return (
      <div data-layout="wide" className="mx-auto w-full max-w-4xl">
        {back}
        <Alert>This title couldn&apos;t be loaded right now. Refresh the page to try again.</Alert>
      </div>
    );
  }
  if (!details && !managed) {
    if (!tmdbUnavailable) notFound();
    return (
      <div data-layout="wide" className="mx-auto w-full max-w-4xl">
        {back}
        <Alert>TMDB couldn&apos;t be reached right now. Refresh the page to try again.</Alert>
      </div>
    );
  }

  const overrides = managed?.overrides ?? {};
  const shown =
    details && (details.mediaType === "movie" ? applyMovieOverrides(details, overrides) : applyTvOverrides(details, overrides));
  const status = !managed ? "unmanaged" : managed.hidden ? "hidden" : "managed";
  const hidden = status === "hidden";
  const title = shown?.title ?? managed?.tmdbTitle ?? "";
  const year = shown ? shown.year : (managed?.tmdbYear ?? null);
  const posterPath = shown ? shown.posterPath : (managed?.tmdbPosterPath ?? null);
  const editedLabels = TITLE_FIELDS.filter((field) => field.key in overrides).map((field) => field.label);
  const refFields = { mediaType, tmdbId: String(tmdbId) };

  return (
    <div data-layout="wide" className="motion-safe:animate-fade-in-up max-md:[overflow-wrap:anywhere] max-md:[&>a:first-child]:min-h-11 max-md:[&>div>a:first-child]:min-h-11">
      <div className="mx-auto w-full max-w-4xl">
        {back}

        <header className="mt-6 grid grid-cols-[5.5rem_minmax(0,1fr)] items-start gap-5 sm:grid-cols-[8rem_minmax(0,1fr)] sm:gap-7 max-md:grid-cols-[4.5rem_minmax(0,1fr)] max-md:gap-4">
          <TmdbImage
            path={posterPath}
            size="w342"
            sizes="8rem"
            className="aspect-[2/3] ring-1 ring-line max-md:col-start-1 max-md:row-start-1"
            fallback={<FilmIcon className="size-6" />}
          />
          <div className="min-w-0 max-md:contents">
            <div className="contents max-md:col-start-2 max-md:row-start-1 max-md:block max-md:min-w-0">
            <p className="flex items-center gap-2 text-xs text-muted">
              <span>{mediaType === "movie" ? "Movie" : "TV show"}</span>
              {hidden && <span aria-hidden="true">·</span>}
              <ContentStatusLabel status={status} />
            </p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight max-md:text-xl max-md:break-words">{title}</h1>
            <p className="mt-1 text-sm text-muted">
              {[year, shown?.genres.join(", ") || null, shown?.tmdbRating ? `TMDB ${shown.tmdbRating}` : null]
                .filter(Boolean)
                .join(" · ")}
            </p>
            </div>
            <div className="contents max-md:col-span-2 max-md:block max-md:min-w-0">
            {shown?.overview && (
              <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-foreground/85">{shown.overview}</p>
            )}

            <p className="mt-3 text-xs text-muted">
              {details
                ? STATUS_NOTES[status]
                : tmdbUnavailable
                  ? "TMDB couldn't be reached, so its details aren't shown."
                  : `TMDB no longer has this ${noun}. It can still be hidden or restored.`}
              {editedLabels.length > 0 && (
                <>
                  {" "}
                  Edited: <span className="text-foreground/80">{editedLabels.join(", ")}</span>.
                </>
              )}
            </p>

            <div className="mt-5 flex flex-wrap gap-2.5 max-md:mt-4 max-md:grid max-md:grid-cols-2 max-md:[&>button]:h-auto max-md:[&>button]:min-h-11 max-md:[&>button]:min-w-0 max-md:[&>button]:py-2 max-md:[&>a]:col-span-2 max-md:[&>a]:min-h-11">
              {details && (
                <EditContentButton
                  label="Edit details"
                  buttonStyle="primary"
                  title={`Edit ${title}`}
                  fields={editFields(TITLE_FIELDS, titleTmdbValues(details), overrides, {
                    date: mediaType === "movie" ? "Release date" : "First air date",
                  })}
                  hiddenFields={refFields}
                  action={saveTitleDetails}
                />
              )}
              <ConfirmActionButton
                label={hidden ? "Restore" : "Hide from Echo"}
                buttonStyle={hidden ? "primary" : "danger"}
                action={setTitleHidden}
                fields={{ ...refFields, hidden: String(!hidden) }}
                title={`${hidden ? "Restore" : "Hide"} ${title}?`}
                description={
                  hidden
                    ? "It returns to Browse, search and its detail page. Seasons and episodes hidden on their own stay hidden."
                    : "It disappears from Browse, search and its detail page, and can't be watched, saved or rated. Members' watchlists, ratings and history are kept."
                }
                confirmLabel={hidden ? "Restore" : "Hide"}
                pendingLabel={hidden ? "Restoring" : "Hiding"}
                confirmVariant={hidden ? "primary" : "danger"}
                successTitle={hidden ? "Restored" : "Hidden"}
              />
              {details && !hidden && (
                <ButtonLink href={titleHref(details)} variant="secondary">
                  View on Echo
                </ButtonLink>
              )}
            </div>
            </div>
          </div>
        </header>

        {details?.mediaType === "tv" && (
          <ShowSeasons show={details} titleId={managed?.id ?? null} showHidden={hidden} />
        )}
      </div>
    </div>
  );
}
