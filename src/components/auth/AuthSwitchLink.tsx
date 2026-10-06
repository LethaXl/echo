import Link from "next/link";
import { ArrowRightIcon } from "@/components/icons";

type AuthSwitchLinkProps = {
  prompt: string;
  href: string;
  label: string;
};

export default function AuthSwitchLink({ prompt, href, label }: AuthSwitchLinkProps) {
  return (
    <p className="text-sm text-muted">
      {prompt}{" "}
      <Link
        href={href}
        className="group inline-flex items-center gap-1 font-medium text-accent transition-colors hover:text-accent-hover"
      >
        {label}
        <ArrowRightIcon className="size-3.5 transition-transform group-hover:translate-x-0.5" />
      </Link>
    </p>
  );
}
