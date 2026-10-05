import type { ReactNode } from "react";

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
      <div className="mt-8 border-t border-line pt-6">
        <p className="text-xs font-medium tracking-wide text-muted uppercase">
          Not implemented yet
        </p>
        <ul className="mt-3 space-y-1 text-sm">
          {plannedStories.map((story) => (
            <li key={story}>{story}</li>
          ))}
        </ul>
      </div>
    </section>
  );
}
