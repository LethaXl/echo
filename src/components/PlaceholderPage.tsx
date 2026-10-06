import type { ReactNode } from "react";
import PlannedStories from "@/components/PlannedStories";

type PlaceholderPageProps = {
  title: string;
  description: ReactNode;
  plannedStories: string[];
};

export default function PlaceholderPage({
  title,
  description,
  plannedStories,
}: PlaceholderPageProps) {
  return (
    <section className="max-w-2xl">
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      <p className="mt-2 text-muted">{description}</p>
      <div className="mt-8">
        <PlannedStories stories={plannedStories} />
      </div>
    </section>
  );
}
