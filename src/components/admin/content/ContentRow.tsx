import Link from "next/link";
import TmdbImage from "@/components/details/TmdbImage";
import { FilmIcon } from "@/components/icons";
import { setTitleHidden } from "@/lib/admin/content-actions";
import type { AdminTitle } from "@/lib/admin/content-queries";
import ConfirmActionButton from "./ConfirmActionButton";
import ContentStatusLabel from "./ContentStatusLabel";
import { adminContentHref } from "./hrefs";
import { SMALL_BUTTON } from "./styles";

/** A title in Content Management lists, with its status and actions. */
export default function ContentRow({ title }: { title: AdminTitle }) {
  const hidden = title.status === "hidden";
  const href = adminContentHref(title);
  return (
    <li className="relative flex items-center gap-4 px-4 py-3 transition-colors duration-150 hover:bg-elevated/40 max-md:grid max-md:grid-cols-[2.5rem_minmax(0,1fr)] max-md:gap-x-3 max-md:gap-y-2">
      <TmdbImage
        path={title.posterPath}
        size="w185"
        sizes="2.5rem"
        className="aspect-[2/3] w-10 shrink-0 max-md:row-span-2 max-md:self-start"
        fallback={<FilmIcon className="size-4" />}
      />
      <div className="min-w-0 flex-1">
        {/* The whole row opens the title; the buttons sit above this link. */}
        <Link
          href={href}
          className="block truncate text-sm font-medium after:absolute after:inset-0 focus-visible:outline-none focus-visible:after:rounded-md focus-visible:after:ring-2 focus-visible:after:ring-accent/70 max-md:line-clamp-2 max-md:whitespace-normal max-md:break-words"
        >
          {title.title}
        </Link>
        <p className="mt-1 flex items-center gap-2 text-xs text-muted max-md:flex-wrap max-md:gap-y-1">
          {title.year && <span>{title.year}</span>}
          {title.year && <span aria-hidden="true">·</span>}
          <span>{title.mediaType === "movie" ? "Movie" : "TV Show"}</span>
          {hidden && <span aria-hidden="true">·</span>}
          <ContentStatusLabel status={title.status} />
        </p>
      </div>
      <div className="relative flex shrink-0 items-center gap-2 max-md:col-start-2 max-md:flex-wrap">
        <ConfirmActionButton
          label={hidden ? "Restore" : "Hide"}
          className="w-[4.5rem]"
          action={setTitleHidden}
          fields={{ mediaType: title.mediaType, tmdbId: String(title.tmdbId), hidden: String(!hidden) }}
          title={`${hidden ? "Restore" : "Hide"} ${title.title}?`}
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
        <Link href={href} className={`${SMALL_BUTTON} w-[4.5rem]`}>
          Manage
        </Link>
      </div>
    </li>
  );
}
