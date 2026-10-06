import Image from "next/image";
import type { ReactNode } from "react";
import { getTmdbImageUrl, type TmdbImageSize } from "@/lib/tmdb/images";

type TmdbImageProps = {
  path: string | null;
  size: TmdbImageSize;
  sizes: string;
  /** Sizing and shape, e.g. an aspect ratio. */
  className?: string;
  /** Extra classes for the image itself, e.g. object position. */
  imageClassName?: string;
  shape?: "rounded" | "circle";
  /** Shown when TMDB has no image for this item. */
  fallback: ReactNode;
  preload?: boolean;
};

export default function TmdbImage({
  path,
  size,
  sizes,
  className = "",
  imageClassName = "",
  shape = "rounded",
  fallback,
  preload = false,
}: TmdbImageProps) {
  const url = getTmdbImageUrl(path, size);
  return (
    <div
      className={`relative overflow-hidden bg-elevated ${shape === "circle" ? "rounded-full" : "rounded-md"} ${className}`}
    >
      {url ? (
        <Image
          src={url}
          alt=""
          fill
          sizes={sizes}
          preload={preload}
          className={`object-cover ${imageClassName}`}
        />
      ) : (
        <div className="flex h-full items-center justify-center text-muted/60">{fallback}</div>
      )}
    </div>
  );
}
