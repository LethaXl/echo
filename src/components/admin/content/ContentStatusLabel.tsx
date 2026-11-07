import type { ContentStatus } from "@/lib/admin/content-queries";

export type StatusTone = "accent" | "danger" | "muted";

const DOT_CLASS_NAMES: Record<StatusTone, string> = {
  accent: "bg-accent",
  danger: "bg-danger",
  muted: "bg-muted/50",
};

const TEXT_CLASS_NAMES: Record<StatusTone, string> = {
  accent: "text-foreground/85",
  danger: "text-danger",
  muted: "text-muted",
};

/** A small dot and label, e.g. whether something is visible on Echo. */
export function StatusLabel({ tone, children }: { tone: StatusTone; children: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${TEXT_CLASS_NAMES[tone]}`}>
      <span aria-hidden="true" className={`size-1.5 shrink-0 rounded-full ${DOT_CLASS_NAMES[tone]}`} />
      {children}
    </span>
  );
}

/** Only hidden titles are labelled; everything else is on Echo as usual. */
export default function ContentStatusLabel({ status }: { status: ContentStatus }) {
  return status === "hidden" ? <StatusLabel tone="danger">Hidden</StatusLabel> : null;
}
