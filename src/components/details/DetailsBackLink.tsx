import Link from "next/link";
import { ArrowLeftIcon } from "@/components/icons";

export default function DetailsBackLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="group -mx-1 inline-flex items-center gap-1.5 rounded-sm px-1 py-0.5 text-sm text-muted transition-colors duration-150 hover:text-accent focus-visible:text-accent"
    >
      <ArrowLeftIcon className="size-3.5 transition-transform duration-150 group-hover:-translate-x-0.5" />
      {label}
    </Link>
  );
}
