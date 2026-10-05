import type { Metadata } from "next";
import PlaceholderPage from "@/components/PlaceholderPage";

export const metadata: Metadata = { title: "Browse" };

export default function BrowsePage() {
  return (
    <PlaceholderPage
      title="Browse"
      description="The movie and TV show catalogue will be loaded from TMDB."
      plannedStories={["US-09 Browse the Catalogue", "US-15 Search by Title"]}
    />
  );
}
