"use client";

import { useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import AccountDetailsList from "@/components/account/AccountDetailsList";
import DeleteAccountForm from "@/components/account/DeleteAccountForm";
import MySubscription from "@/components/account/MySubscription";
import SubscriptionHistory from "@/components/account/SubscriptionHistory";
import ChangePasswordForm from "@/components/auth/ChangePasswordForm";
import { FieldErrorPlacementContext } from "@/components/forms/FieldErrorPopover";
import type { AccountDetails } from "@/lib/account/queries";
import { ACCOUNT_SECTIONS as SECTIONS, type AccountSectionId as SectionId } from "@/lib/account/sections";

export default function AccountSettings({
  details,
  initialSection = "overview",
}: {
  details: AccountDetails;
  initialSection?: SectionId;
}) {
  const [active, setActive] = useState<SectionId>(initialSection);
  const baseId = useId();
  const tabRefs = useRef<Partial<Record<SectionId, HTMLButtonElement | null>>>({});

  const tabId = (id: SectionId) => `${baseId}-${id}-tab`;
  const panelId = (id: SectionId) => `${baseId}-${id}-panel`;

  function select(id: SectionId, focus = false) {
    setActive(id);
    if (focus) tabRefs.current[id]?.focus();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const index = SECTIONS.findIndex((section) => section.id === active);
    const keyTargets: Record<string, number> = {
      ArrowRight: (index + 1) % SECTIONS.length,
      ArrowLeft: (index - 1 + SECTIONS.length) % SECTIONS.length,
      Home: 0,
      End: SECTIONS.length - 1,
    };
    const target = keyTargets[event.key];
    if (target === undefined) return;
    event.preventDefault();
    select(SECTIONS[target].id, true);
  }

  function panel(id: SectionId, children: ReactNode, className = "") {
    return (
      <section
        role="tabpanel"
        id={panelId(id)}
        aria-labelledby={tabId(id)}
        hidden={active !== id}
        className={`motion-safe:animate-fade-in-up ${className}`}
      >
        {children}
      </section>
    );
  }

  return (
    <FieldErrorPlacementContext value="below">
      <nav aria-label="Account settings" className="mt-5">
        <div
          role="tablist"
          aria-orientation="horizontal"
          onKeyDown={handleKeyDown}
          className="relative grid"
          style={{ gridTemplateColumns: `repeat(${SECTIONS.length}, minmax(0, 1fr))` }}
        >
          <span
            aria-hidden="true"
            className="absolute top-[7px] h-px bg-line"
            style={{ left: `${50 / SECTIONS.length}%`, right: `${50 / SECTIONS.length}%` }}
          />
          {SECTIONS.map((section) => {
            const selected = active === section.id;
            return (
              <button
                key={section.id}
                ref={(element) => {
                  tabRefs.current[section.id] = element;
                }}
                type="button"
                role="tab"
                id={tabId(section.id)}
                aria-selected={selected}
                aria-controls={panelId(section.id)}
                tabIndex={selected ? 0 : -1}
                onClick={() => select(section.id)}
                className={`group relative flex flex-col items-center gap-3 rounded-sm text-sm transition-colors ${
                  selected ? "font-medium text-accent" : "text-muted hover:text-foreground"
                }`}
              >
                <span aria-hidden="true" className="flex size-[15px] items-center justify-center">
                  <span
                    className={`rounded-full ring-4 ring-background transition-all duration-200 ${
                      selected
                        ? "size-3.5 bg-accent"
                        : "size-2 bg-muted/50 group-hover:bg-muted"
                    }`}
                  />
                </span>
                {section.label}
              </button>
            );
          })}
        </div>
      </nav>

      <div className="mt-6">
        {panel("overview", <AccountDetailsList details={details} />)}
        {panel(
          "subscription",
          <div className="flex flex-col gap-8">
            <MySubscription
              lookup={details.subscription}
              pastSubscription={details.pastSubscription}
              billingOptions={details.billingOptions}
            />
            <SubscriptionHistory history={details.history} />
          </div>,
        )}
        {panel("security", <ChangePasswordForm />, "mx-auto max-w-md")}
        {panel("delete", <DeleteAccountForm />, "mx-auto max-w-sm")}
      </div>
    </FieldErrorPlacementContext>
  );
}
