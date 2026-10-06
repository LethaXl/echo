export default function PlannedStories({ stories }: { stories: string[] }) {
  return (
    <div className="border-t border-line pt-6">
      <p className="text-xs font-medium tracking-wide text-muted uppercase">
        Not implemented yet
      </p>
      <ul className="mt-3 space-y-1 text-sm">
        {stories.map((story) => (
          <li key={story}>{story}</li>
        ))}
      </ul>
    </div>
  );
}
