"use client";
import { buttonClassName } from "@/components/ButtonLink";
export default function CaveError({ reset }: { reset: () => void }) {
  return <div className="py-16"><h1 className="text-2xl font-semibold">Cave couldn&apos;t be loaded.</h1>
    <button onClick={reset} className={`mt-6 ${buttonClassName("secondary")}`}>Try again</button></div>;
}
