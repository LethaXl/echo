import Image from "next/image";
import Link from "next/link";
import ButtonLink from "@/components/ButtonLink";
import NavLink from "@/components/NavLink";
import UserMenu from "@/components/UserMenu";
import { getProfileName } from "@/lib/account/queries";
import { getCurrentUser } from "@/lib/auth/session";
import { APP_NAME } from "@/lib/brand";
import { getWatchlistAccess } from "@/lib/watchlist/access";

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/browse", label: "Browse" },
  { href: "/cave", label: "Cave" },
  { href: "/plans", label: "Plans" },
];

export default async function Navbar() {
  const user = await getCurrentUser();
  const [profileName, caveAccess] = await Promise.all([
    user ? getProfileName(user.id) : null,
    user ? getWatchlistAccess() : null,
  ]);
  const firstName = profileName?.trim().split(/\s+/)[0] || "Account";

  return (
    <header className="border-b border-line bg-surface">
      <nav className="mx-auto flex h-20 w-full max-w-[96rem] items-center justify-between px-10">
        <div className="flex items-center gap-14">
          <Link href="/" className="flex rounded-sm">
            <Image
              src="/echo-logo.png"
              alt={APP_NAME}
              width={447}
              height={160}
              preload
              className="h-9 w-auto"
            />
          </Link>
          <ul className="flex items-center gap-8 text-base">
            {navLinks.map((link) => (
              <li key={link.href}>
                {link.href === "/cave" && caveAccess?.status !== "member" ? (
                  <span
                    role="link"
                    aria-disabled="true"
                    title={user ? "Echo+ is required to use Cave" : "Log in to access Cave"}
                    className="flex h-9 cursor-not-allowed items-center font-medium text-muted/40"
                  >
                    {link.label}
                  </span>
                ) : (
                  <NavLink href={link.href} label={link.label} />
                )}
              </li>
            ))}
          </ul>
        </div>
        {user ? (
          <UserMenu firstName={firstName} />
        ) : (
          <div className="flex items-center gap-6">
            <Link
              href="/login"
              className="rounded-sm text-base font-medium text-muted transition-colors duration-150 hover:text-foreground"
            >
              Log In
            </Link>
            <ButtonLink href="/register">Sign Up</ButtonLink>
          </div>
        )}
      </nav>
    </header>
  );
}
