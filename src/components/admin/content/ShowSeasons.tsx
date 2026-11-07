import { getSeasonItems } from "@/lib/admin/content-queries";
import type { TvShowDetails } from "@/types/media";
import SeasonManager from "./SeasonManager";
import { ERROR_NOTE } from "./styles";

type ShowSeasonsProps = {
  show: TvShowDetails;
  /** The show's record, or `null` when it isn't managed yet. */
  titleId: string | null;
  showHidden: boolean;
};

/** Every season TMDB lists for a show, managed or not; episodes load when a season is opened. */
export default async function ShowSeasons({ show, titleId, showHidden }: ShowSeasonsProps) {
  const seasons = await getSeasonItems(show, titleId);
  if (!seasons) {
    return (
      <p role="alert" className={`mt-12 ${ERROR_NOTE}`}>
        Seasons couldn&apos;t be loaded right now. Refresh the page to try again.
      </p>
    );
  }
  return <SeasonManager showId={show.tmdbId} showHidden={showHidden} seasons={seasons} />;
}
