import { ShieldCheckIcon } from "@/components/icons";

/** Muted Echo tones, picked from the account ID so an account always gets the same one. */
const AVATAR_TONES = [
  "bg-accent/15 text-accent",
  "bg-elevated text-foreground/80",
  "bg-muted/15 text-muted",
];

function initials(name: string | null, email: string): string {
  const words = name?.trim().split(/\s+/).filter(Boolean) ?? [];
  if (words.length > 0) {
    const first = words[0][0];
    const last = words.length > 1 ? words[words.length - 1][0] : "";
    return (first + last).toUpperCase();
  }
  return email.trim()[0]?.toUpperCase() ?? "?";
}

function tone(id: string): string {
  let hash = 0;
  for (const char of id) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return AVATAR_TONES[hash % AVATAR_TONES.length];
}

export function UserAvatar({
  id,
  name,
  email,
  size = "sm",
}: {
  id: string;
  name: string | null;
  email: string;
  size?: "sm" | "lg";
}) {
  return (
    <span
      aria-hidden="true"
      className={`flex shrink-0 items-center justify-center rounded-full font-semibold select-none ${tone(id)} ${
        size === "lg" ? "size-14 text-base" : "size-8 text-[11px]"
      }`}
    >
      {initials(name, email)}
    </span>
  );
}

/** Shown only for accounts whose role the database reports as admin. */
export function AdminIcon({ className = "size-3.5" }: { className?: string }) {
  return (
    <span title="Admin" className="inline-flex shrink-0 text-accent">
      <ShieldCheckIcon className={className} />
      <span className="sr-only">Admin</span>
    </span>
  );
}
