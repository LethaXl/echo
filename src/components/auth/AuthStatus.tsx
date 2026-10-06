import type { ReactNode } from "react";

type AuthStatusProps = {
  title: string;
  children: ReactNode;
  note?: ReactNode;
  action?: ReactNode;
};

export default function AuthStatus({ title, children, note, action }: AuthStatusProps) {
  return (
    <div role="status" className="motion-safe:animate-fade-in-up">
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      <p className="mt-3 text-sm leading-relaxed text-muted">{children}</p>
      {note && <p className="mt-6 border-t border-line pt-4 text-xs text-muted">{note}</p>}
      {action && <div className="mt-6 flex flex-col items-start gap-4">{action}</div>}
    </div>
  );
}
