import ButtonLink from "@/components/ButtonLink";
import { ArrowLeftIcon } from "@/components/icons";

export default function BackLink({ href, label }: { href: string; label: string }) {
  return (
    <ButtonLink href={href} variant="secondary" size="lg" className="group w-full">
      <ArrowLeftIcon className="size-4 transition-transform group-hover:-translate-x-0.5" />
      {label}
    </ButtonLink>
  );
}
