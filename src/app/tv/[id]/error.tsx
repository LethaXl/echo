"use client";

import DetailsError from "@/components/details/DetailsError";

export default function TvShowError({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return <DetailsError retry={retry} />;
}
