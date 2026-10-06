"use client";

import { buttonClassName } from "@/components/ButtonLink";
import DetailsBackLink from "@/components/details/DetailsBackLink";

export default function DetailsError({ retry }: { retry: () => void }) {
  return (
    <div data-layout="wide" className="pt-2 pb-8">
      <DetailsBackLink href="/browse" label="Browse" />
      <div className="mt-10 max-w-md">
        <h1 className="text-2xl font-semibold tracking-tight">This page couldn&apos;t be loaded</h1>
        <p className="mt-2 text-muted">
          We couldn&apos;t reach TMDB just now. Check your connection and try again.
        </p>
        <button type="button" onClick={retry} className={`mt-6 ${buttonClassName("secondary")}`}>
          Try again
        </button>
      </div>
    </div>
  );
}
