"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type NavLinkProps = {
  href: string;
  label: string;
  mobile?: boolean;
};

export default function NavLink({ href, label, mobile = false }: NavLinkProps) {
  const pathname = usePathname();
  const isActive = href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <Link
      href={href}
      aria-current={isActive ? "page" : undefined}
      className={`relative flex h-9 items-center rounded-sm font-medium transition-colors duration-150 ${
        isActive ? "text-foreground" : "text-muted hover:text-foreground"
      }${mobile ? ` max-md:h-11 max-md:justify-center max-md:rounded-md max-md:border-l-2 max-md:px-3 max-md:text-center max-md:text-sm max-md:active:bg-accent/10 ${isActive ? "max-md:border-accent max-md:bg-accent/10 max-md:text-accent-hover" : "max-md:border-transparent max-md:hover:bg-elevated"}` : ""}`}
    >
      {label}
      {isActive && (
        <svg
          aria-hidden="true"
          viewBox="0 0 20 6"
          className={`absolute -bottom-0.5 left-1/2 h-1.5 w-5 -translate-x-1/2 text-accent${mobile ? " max-md:hidden" : ""}`}
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
