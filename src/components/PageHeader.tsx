import type { ReactNode } from "react";

type PageHeaderProps = {
  eyebrow: string;
  title: ReactNode;
  description: ReactNode;
};

export default function PageHeader({ eyebrow, title, description }: PageHeaderProps) {
  return (
    <header className="flex gap-4 max-md:gap-3">
      <div aria-hidden="true" className="flex gap-[3px] max-md:shrink-0">
        <span className="w-0.5 rounded-full bg-accent/15" />
        <span className="w-0.5 rounded-full bg-accent/45" />
        <span className="w-0.5 rounded-full bg-accent" />
      </div>
      <div className="max-md:min-w-0 max-md:break-words">
        <p className="text-[11px] leading-none font-semibold tracking-[0.18em] text-accent uppercase">
          {eyebrow}
        </p>
        <h1 className="mt-2 text-[1.75rem] leading-tight font-semibold tracking-tight">{title}</h1>
        <p className="mt-1 text-[0.9375rem] text-muted">{description}</p>
      </div>
    </header>
  );
}
