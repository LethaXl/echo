import Image from "next/image";
import Link from "next/link";
import ButtonLink from "@/components/ButtonLink";
import NavLink from "@/components/NavLink";
import UserMenu from "@/components/UserMenu";
import MobileNavigation from "@/components/MobileNavigation";
import { getProfileName } from "@/lib/account/queries";
import { isCurrentUserAdmin } from "@/lib/admin/access";
import { getCurrentUser, isCurrentAccountDeactivated } from "@/lib/auth/session";
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
  const [profileName, caveAccess, isAdmin, deactivated] = await Promise.all([
    user ? getProfileName(user.id) : null,
    user ? getWatchlistAccess() : null,
    user ? isCurrentUserAdmin() : false,
    user ? false : isCurrentAccountDeactivated(),
  ]);
  const firstName = profileName?.trim().split(/\s+/)[0] || "Account";

  return (
    <header className="border-b border-line bg-surface">
      <nav className="mx-auto flex h-20 w-full max-w-[96rem] items-center justify-between px-10 max-md:hidden">
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
          {/* A deactivated account only sees its deactivation screen, which has its own log out. */}
          {!deactivated && (
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
          )}
        </div>
        {deactivated ? null : user ? (
          <UserMenu firstName={firstName} isAdmin={isAdmin} />
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
      <nav aria-label="Mobile navigation" className="hidden h-16 items-center justify-between gap-3 px-4 max-md:flex">
        <Link href="/" className="flex shrink-0 rounded-sm">
          <Image src="/echo-logo.png" alt={APP_NAME} width={447} height={160} className="h-9 w-auto" />
        </Link>
        {!deactivated && (
          <div className="flex min-w-0 items-center gap-2">
            {user && <UserMenu firstName={firstName} isAdmin={isAdmin} />}
            <MobileNavigation>
              <ul className="flex flex-col gap-1 text-base">
                {navLinks.map((link) => (
                  <li key={link.href}>
                    {link.href === "/cave" && caveAccess?.status !== "member" ? (
                      <span
                        role="link"
                        aria-disabled="true"
                        title={user ? "Echo+ is required to use Cave" : "Log in to access Cave"}
                        className="flex min-h-11 flex-col justify-center rounded-sm px-3 py-2 font-medium text-muted/40 max-md:items-center max-md:rounded-md max-md:border-l-2 max-md:border-transparent max-md:py-1.5 max-md:text-center max-md:text-sm max-md:text-muted/60"
                      >
                        {link.label}
                        <span className="text-xs font-normal">{user ? "Echo+ is required to use Cave" : "Log in to access Cave"}</span>
                      </span>
                    ) : <NavLink href={link.href} label={link.label} mobile />}
                  </li>
                ))}
              </ul>
              {!user && (
                <div className="mt-3 grid gap-2 border-t border-line pt-3 max-md:grid-cols-1">
                  <ButtonLink href="/login" variant="secondary" className="min-h-11 max-md:px-3 max-md:font-semibold">Log In</ButtonLink>
                  <ButtonLink href="/register" className="min-h-11 max-md:px-3 max-md:font-semibold">Sign Up</ButtonLink>
                </div>
              )}
            </MobileNavigation>
          </div>
        )}
      </nav>
    </header>
  );
}
