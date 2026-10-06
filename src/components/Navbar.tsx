import Link from "next/link";
import ButtonLink, { buttonClassName } from "@/components/ButtonLink";
import NavLink from "@/components/NavLink";
import { logOut } from "@/lib/auth/actions";
import { getCurrentUser } from "@/lib/auth/session";
import { APP_NAME } from "@/lib/brand";

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/browse", label: "Browse" },
  { href: "/plans", label: "Plans" },
];

const secondaryLinkClassName = "text-muted transition-colors hover:text-foreground";

export default async function Navbar() {
  const user = await getCurrentUser();

  return (
    <header className="border-b border-line bg-surface">
      <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-8">
        <div className="flex items-center gap-10">
          <Link href="/" className="text-xl font-bold tracking-tight">
            {APP_NAME}
          </Link>
          <ul className="flex items-center gap-6 text-sm">
            {navLinks.map((link) => (
              <li key={link.href}>
                <NavLink href={link.href} label={link.label} />
              </li>
            ))}
          </ul>
        </div>
        <div className="flex items-center gap-5 text-sm">
          {user ? (
            <>
              <Link href="/account" className={secondaryLinkClassName}>
                Account
              </Link>
              <form action={logOut}>
                <button type="submit" className={buttonClassName("secondary")}>
                  Log Out
                </button>
              </form>
            </>
          ) : (
            <>
              <Link href="/login" className={secondaryLinkClassName}>
                Log In
              </Link>
              <ButtonLink href="/register">Sign Up</ButtonLink>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
