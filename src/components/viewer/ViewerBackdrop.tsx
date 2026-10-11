import Image from "next/image";
import { FilmIcon } from "@/components/icons";
import { getTmdbImageUrl } from "@/lib/tmdb/images";
import type { ViewerImage } from "@/lib/viewer/types";

/** The title's TMDB image filling the viewing area, dimmed so text and controls stay readable. */
export default function ViewerBackdrop({ image }: { image: ViewerImage }) {
  const url = getTmdbImageUrl(image.path, image.size);
  return (
    <>
      {url ? (
        <Image src={url} alt="" fill preload sizes="(min-width: 96rem) 96rem, 100vw" className="object-cover" />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-elevated text-muted/40">
          <FilmIcon className="size-12" />
        </div>
      )}
      <div aria-hidden="true" className="absolute inset-0 bg-background/55" />
      <div
        aria-hidden="true"
        className="absolute inset-x-0 bottom-0 h-1/2 bg-linear-to-t from-background/90 to-transparent"
      />
    </>
  );
}
