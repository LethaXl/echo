"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { ChevronDownIcon, UserIcon } from "@/components/icons";
import { logOut } from "@/lib/auth/actions";

const itemClassName =
  "group flex h-8 w-full items-center gap-2 rounded-sm pr-3 pl-2.5 text-left text-[13px] whitespace-nowrap transition-colors duration-150 max-md:h-11 max-md:text-sm";
const dotClassName = "size-1 shrink-0 rounded-full transition-colors duration-150";

/** `isAdmin` comes from the server-rendered navbar, so the Admin Panel item never flashes for others. */
export default function UserMenu({ firstName, isAdmin }: { firstName: string; isAdmin: boolean }) {
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      setOpen(false);
      triggerRef.current?.focus();
    }
    const desktop = window.matchMedia("(min-width: 48rem)");
    function handleViewportChange() {
      // Do not leave a hidden copy of the menu handling keyboard events after a cutoff change.
      setOpen(false);
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    desktop.addEventListener("change", handleViewportChange);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
      desktop.removeEventListener("change", handleViewportChange);
    };
  }, [open]);

  return (
    <div
      ref={containerRef}
      className="relative -mr-3 max-md:mr-0"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
    >
      <button
        ref={triggerRef}
        type="button"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((value) => !value)}
        className={`group flex h-10 items-center gap-2.5 rounded-md px-3 text-base font-medium text-foreground transition-colors duration-150 hover:bg-elevated max-md:h-11 max-md:w-11 max-md:justify-center max-md:gap-0 max-md:px-0 ${
          open ? "bg-elevated" : ""
        }`}
      >
        <UserIcon
          className={`size-5 transition-colors duration-150 group-hover:text-foreground ${
            open ? "text-foreground" : "text-muted"
          }`}
        />
        <span className="sr-only md:hidden">Account menu for </span>
        <span className="max-w-32 truncate max-md:sr-only">{firstName}</span>
        <ChevronDownIcon
          className={`size-4 text-accent transition-transform duration-150 max-md:hidden ${open ? "rotate-180" : ""}`}
        />
      </button>

      {/* Kept mounted while closed so the log out form can finish submitting. */}
      <div
        id={menuId}
        hidden={!open}
        className="absolute top-full left-1/2 z-40 mt-1.5 w-max -translate-x-1/2 rounded-md border border-line bg-elevated p-1 motion-safe:animate-menu-in max-md:-right-16 max-md:left-auto max-md:max-h-[calc(100dvh-6rem)] max-md:max-w-[calc(100vw-2rem)] max-md:translate-x-0 max-md:overflow-y-auto"
      >
        {isAdmin && (
          <>
            <Link
              href="/admin"
              onClick={() => setOpen(false)}
              className={`${itemClassName} text-foreground/85 hover:bg-line hover:text-foreground`}
            >
              <span aria-hidden="true" className={`${dotClassName} bg-muted/60 group-hover:bg-accent`} />
              Admin Panel
            </Link>
            <div aria-hidden="true" className="mx-1 my-1 h-px bg-line" />
          </>
        )}
        <Link
          href="/account"
          onClick={() => setOpen(false)}
          className={`${itemClassName} text-foreground/85 hover:bg-line hover:text-foreground`}
        >
          <span aria-hidden="true" className={`${dotClassName} bg-muted/60 group-hover:bg-accent`} />
          Account
        </Link>
        <div aria-hidden="true" className="mx-1 my-1 h-px bg-line" />
        <form action={logOut} onSubmit={() => setOpen(false)}>
          <button
            type="submit"
            className={`${itemClassName} text-muted hover:bg-danger/10 hover:text-danger`}
          >
            <span aria-hidden="true" className={`${dotClassName} bg-muted/60 group-hover:bg-danger`} />
            Log out
          </button>
        </form>
      </div>
    </div>
  );
}
