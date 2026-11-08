import Image from "next/image";
import Link from "next/link";
import ButtonLink from "@/components/ButtonLink";
import EchoPlus from "@/components/EchoPlus";
import FormMessage from "@/components/forms/FormMessage";
import { ArrowRightIcon } from "@/components/icons";
import { APP_NAME } from "@/lib/brand";
import { titleHref } from "@/lib/media-routes";
import { getTitles } from "@/lib/tmdb/catalogue";
import { getTmdbImageUrl } from "@/lib/tmdb/images";
import type { CatalogueItem, MediaReference } from "@/types/media";

const HIGHLIGHTS = [
  { title: "Search any title", text: "Movies and shows" },
  { title: "Go deeper", text: "Cast, seasons, episodes" },
  { title: "Start an Echo", text: "Follow where it leads" },
];

const movie = (tmdbId: number): MediaReference => ({ mediaType: "movie", tmdbId });
const tv = (tmdbId: number): MediaReference => ({ mediaType: "tv", tmdbId });

/**
 * The poster wall: movies on the top row, shows below. The offsets stagger the columns like a
 * shelf, and the last column only fits from xl up.
 */
const WALL_COLUMNS = [
  { offset: "pt-6", titles: [movie(11324), tv(1396)] }, // Shutter Island, Breaking Bad
  { offset: "pt-0", titles: [movie(240), tv(1398)] }, // The Godfather Part II, The Sopranos
  { offset: "pt-10", titles: [movie(157336), tv(2316)] }, // Interstellar, The Office
  { offset: "pt-3 max-xl:hidden", titles: [movie(60308), tv(1434)] }, // Moneyball, Family Guy
];

function PosterWall({ columns, mobile = false }: {
  columns: { offset: string; items: CatalogueItem[] }[];
  mobile?: boolean;
}) {
  return (
    <div aria-label="Featured titles" role="group" className={mobile ? "grid grid-cols-2 items-start gap-3 md:hidden" : "hidden gap-3 lg:flex"}>
      {columns.map(({ offset, items }, column) => (
        <div key={offset} className={`flex flex-col gap-3 ${offset}`}>
          {items.map((item, row) => (
            <Link
              key={`${item.mediaType}-${item.tmdbId}`}
              href={titleHref(item)}
              aria-label={item.title}
              title={item.title}
              style={{ animationDelay: `${(column + row * columns.length) * 60}ms` }}
              className={`group relative block aspect-[2/3] w-32 overflow-hidden rounded-md bg-elevated ring-1 ring-line transition duration-200 ease-out hover:-translate-y-1 hover:ring-accent/60 motion-safe:animate-fade-in-up xl:w-36 ${mobile ? "max-md:w-full" : ""}`}
            >
              <Image
                src={getTmdbImageUrl(item.posterPath, "w342") ?? ""}
                alt=""
                fill
                sizes={mobile ? "(max-width: 319px) calc((100vw - 76px) / 2), 122px" : "144px"}
                className="object-cover transition duration-200 group-hover:brightness-110"
              />
            </Link>
          ))}
        </div>
      ))}
    </div>
  );
}

export default async function Home({ searchParams }: PageProps<"/">) {
  const [{ accountDeleted }, titles] = await Promise.all([
    searchParams,
    getTitles(WALL_COLUMNS.flatMap((column) => column.titles)),
  ]);
  const wallTitleCount = WALL_COLUMNS.reduce((total, column) => total + column.titles.length, 0);
  // Hidden titles are left out of `titles`, and the columns need every poster to line up.
  const wall =
    titles && titles.length === wallTitleCount && titles.every((item) => item.posterPath)
      ? WALL_COLUMNS.map(({ offset, titles: column }, index) => ({
          offset,
          items: titles.slice(index * column.length, (index + 1) * column.length),
        }))
      : null;

  return (
    <section
      data-layout="wide"
      className="grid flex-1 items-center gap-16 lg:grid-cols-[minmax(0,1fr)_auto] motion-safe:animate-fade-in-up max-md:content-start max-md:items-start max-md:gap-0 max-md:py-4"
    >
      <div className="max-w-xl">
        {accountDeleted === "1" && (
          <div className="mb-8">
            <FormMessage state={{ status: "success", message: "Your account has been deleted." }} />
          </div>
        )}
        <p className="text-[11px] leading-none font-semibold tracking-[0.18em] text-accent uppercase">
          Welcome to {APP_NAME}
        </p>
        <h1 className="mt-5 text-[3.25rem] leading-[1.05] font-semibold tracking-tight max-md:mt-4 max-md:text-[clamp(2rem,9vw,2.5rem)] max-md:leading-[1.1] max-md:text-balance">
          Find what you&apos;ll watch next.
        </h1>
        <p className="mt-5 text-lg leading-relaxed text-muted max-md:mt-4 max-md:text-sm">
          Browse movies and shows, explore the details and discover where your next watch leads.
        </p>
        <div className="mt-9 flex items-center gap-3 max-md:mt-6 max-md:flex-wrap max-md:gap-2 max-[23rem]:flex-col max-[23rem]:items-stretch">
          <ButtonLink href="/browse" size="lg" className="group max-md:px-4 max-md:whitespace-nowrap max-[23rem]:w-full">
            Start browsing
            <ArrowRightIcon className="size-4 transition-transform duration-200 group-hover:translate-x-0.5" />
          </ButtonLink>
          <ButtonLink href="/plans" variant="secondary" size="lg" className="bg-surface max-md:px-4 max-md:whitespace-nowrap max-[23rem]:w-full">
            <span>
              Explore <EchoPlus />
            </span>
          </ButtonLink>
        </div>

        {wall && (
          <div className="hidden max-md:mt-7 max-md:block">
            <div className="mx-auto w-[calc(100%-2rem)] max-w-[16rem]">
              <PosterWall columns={wall.slice(0, 2)} mobile />
            </div>
          </div>
        )}

        <ul className="mt-12 grid grid-cols-3 divide-x divide-accent/40 rounded-md border border-accent/60 bg-surface max-md:hidden">
          {HIGHLIGHTS.map(({ title, text }, index) => (
            <li key={title} className="px-5 py-4 text-center max-md:grid max-md:grid-cols-[2rem_minmax(0,1fr)] max-md:gap-3 max-md:px-0 max-md:py-3 max-md:text-left">
              <span aria-hidden="true" className="hidden max-md:block max-md:pt-1 max-md:font-mono max-md:text-xs max-md:tracking-widest max-md:text-accent">
                {String(index + 1).padStart(2, "0")}
              </span>
              <div className="contents max-md:block">
                <p className="text-sm font-medium text-foreground max-md:text-base max-md:font-semibold">{title}</p>
                <p className="mt-1 text-[0.8125rem] text-muted max-md:mt-0.5 max-md:text-sm max-md:leading-relaxed">{text}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {wall && <PosterWall columns={wall} />}
    </section>
  );
}
