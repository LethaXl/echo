import { AlertCircleIcon, CheckIcon } from "@/components/icons";
import type { FormState } from "@/lib/auth/form-state";

export default function FormMessage({ state }: { state: FormState }) {
  if (state.status === "idle" || !state.message) {
    return null;
  }

  const isError = state.status === "error";
  const Icon = isError ? AlertCircleIcon : CheckIcon;

  return (
    <p
      role={isError ? "alert" : "status"}
      className={`flex items-start gap-2.5 rounded-md border px-3 py-2.5 text-sm motion-safe:animate-fade-in-up ${
        isError
          ? "border-danger/30 bg-danger/10 text-danger"
          : "border-accent/30 bg-accent/10 text-foreground"
      }`}
    >
      <Icon className={`mt-0.5 size-4 shrink-0 ${isError ? "" : "text-accent"}`} />
      <span>{state.message}</span>
    </p>
  );
}
