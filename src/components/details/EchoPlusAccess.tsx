import Link from "next/link";
import EchoPlus from "@/components/EchoPlus";
import { ArrowRightIcon, CheckIcon } from "@/components/icons";

// US-14 See Subscription Requirements
export default function EchoPlusAccess({ hasEchoPlus }: { hasEchoPlus: boolean }) {
  if (hasEchoPlus) {
    return (
      <p className="inline-flex items-center gap-2 rounded-md border border-line bg-surface px-3.5 py-2 text-sm text-foreground/90">
        <CheckIcon className="size-4 text-accent" />
        <span>
          Included with <EchoPlus />
        </span>
      </p>
    );
  }

  return (
    <div className="inline-flex items-center gap-3.5 rounded-md border border-line bg-surface py-2 pr-3 pl-3.5 text-sm">
      <p className="text-foreground/90">
        <EchoPlus /> required to watch and rate
      </p>
      <span aria-hidden="true" className="h-4 w-px bg-line" />
      <Link
        href="/plans"
        className="group inline-flex items-center gap-1 rounded-sm font-medium text-muted transition-colors duration-150 hover:text-accent focus-visible:text-accent"
      >
        View plans
        <ArrowRightIcon className="size-3.5 transition-transform duration-150 group-hover:translate-x-0.5" />
      </Link>
    </div>
  );
}
