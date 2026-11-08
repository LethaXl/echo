"use client";

import Link, { useLinkStatus } from "next/link";
import { RefreshIcon } from "@/components/icons";

function PendingRefreshIcon() {
  const { pending } = useLinkStatus();
  return <RefreshIcon className={`size-4 ${pending ? "animate-spin" : ""}`} />;
}

export default function NewEchoLink({ href }: { href: string }) {
  return (
    <Link
      href={href}
      scroll={false}
      prefetch={false}
      className="-mr-2.5 inline-flex h-8 max-md:h-11 max-md:mr-0 max-md:col-start-2 max-md:row-start-1 shrink-0 items-center gap-1.5 rounded-md px-2.5 text-sm font-medium text-muted transition-colors duration-150 hover:bg-elevated hover:text-accent focus-visible:bg-elevated focus-visible:text-accent"
    >
      <PendingRefreshIcon />
      New Echo
    </Link>
  );
}
