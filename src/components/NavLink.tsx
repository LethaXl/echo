"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type NavLinkProps = {
  href: string;
  label: string;
};

export default function NavLink({ href, label }: NavLinkProps) {
  const pathname = usePathname();
  const isActive = href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <Link
      href={href}
      aria-current={isActive ? "page" : undefined}
      className={`relative flex h-9 items-center rounded-sm font-medium transition-colors duration-150 ${
        isActive ? "text-foreground" : "text-muted hover:text-foreground"
      }`}
    >
      {label}
      {isActive && (
        <svg
          aria-hidden="true"
          viewBox="0 0 20 6"
          className="absolute -bottom-0.5 left-1/2 h-1.5 w-5 -translate-x-1/2 text-accent"
        >
          <path
            d="M2 1.5Q10 6 18 1.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      )}
    </Link>
  );
}
