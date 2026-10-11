export const ACCOUNT_SECTIONS = [
  { id: "overview", label: "Overview" },
  { id: "subscription", label: "Subscription" },
  { id: "security", label: "Security" },
  { id: "delete", label: "Delete account" },
] as const;

export type AccountSectionId = (typeof ACCOUNT_SECTIONS)[number]["id"];

/** For `/account?tab=`, e.g. linking straight to the subscription after subscribing. */
export function parseAccountSection(value: unknown): AccountSectionId | null {
  return ACCOUNT_SECTIONS.find((section) => section.id === value)?.id ?? null;
}
