"use client";

import { AlertCircleIcon, CheckIcon, XIcon } from "@/components/icons";

type ToastProps = {
  message: string;
  onDismiss: () => void;
  tone?: "error" | "success";
  duration?: number;
};

export default function Toast({ message, onDismiss, tone = "error", duration = 6000 }: ToastProps) {
  const [title, ...details] = message.split(/(?<=\.)\s+/);
  const isError = tone === "error";
  const Icon = isError ? AlertCircleIcon : CheckIcon;

  return (
    <div
      role={isError ? "alert" : "status"}
      className="group fixed right-6 bottom-6 z-50 flex max-w-sm items-start gap-2.5 rounded-md border border-line bg-elevated py-2.5 pr-2 pl-3.5 text-sm shadow-md shadow-black/30 motion-safe:animate-toast-in"
    >
      <Icon className={`mt-0.5 size-4 shrink-0 ${isError ? "text-danger" : "text-accent"}`} />
      <div className="min-w-0 flex-1">
        <p className="font-medium text-foreground">{title.replace(/\.$/, "")}</p>
        {details.length > 0 && <p className="mt-0.5 text-muted">{details.join(" ")}</p>}
      </div>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss"
        className="-my-0.5 flex size-6 shrink-0 items-center justify-center rounded-sm text-muted transition-colors hover:text-foreground"
      >
        <XIcon className="size-3.5" />
      </button>
      <span
        aria-hidden="true"
        onAnimationEnd={onDismiss}
        style={{ animationDuration: `${duration}ms` }}
        className="absolute h-0 w-full animate-toast-timer group-hover:[animation-play-state:paused]"
      />
    </div>
  );
}
