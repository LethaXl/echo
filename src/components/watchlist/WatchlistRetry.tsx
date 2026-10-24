"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { buttonClassName } from "@/components/ButtonLink";

export default function WatchlistRetry() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <button type="button" disabled={pending} className={buttonClassName("secondary")}
      onClick={() => startTransition(() => router.refresh())}>
      {pending ? "Loading…" : "Try again"}
    </button>
  );
}
