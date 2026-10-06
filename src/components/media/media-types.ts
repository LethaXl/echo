import type { ComponentType } from "react";
import { ClapperboardIcon, TvIcon } from "@/components/icons";
import type { MediaType } from "@/types/media";

export const MEDIA_TYPES: Record<
  MediaType,
  { label: string; Icon: ComponentType<{ className?: string }> }
> = {
  movie: { label: "Movie", Icon: ClapperboardIcon },
  tv: { label: "TV show", Icon: TvIcon },
};
