import ButtonLink from "@/components/ButtonLink";

export default function TitleNotFound() {
  return (
    <div data-layout="wide" className="pt-2 pb-8">
      <div className="mt-10 max-w-md">
        <h1 className="text-2xl font-semibold tracking-tight">We couldn&apos;t find that title</h1>
        <p className="mt-2 text-muted">
          The link may be wrong, or the title is no longer listed on TMDB.
        </p>
        <ButtonLink href="/browse" variant="secondary" className="mt-6">
          Back to Browse
        </ButtonLink>
      </div>
    </div>
  );
}
