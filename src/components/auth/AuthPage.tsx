import type { ReactNode } from "react";

type AuthHeaderProps = {
  title: string;
  description?: ReactNode;
};

export function AuthHeader({ title, description }: AuthHeaderProps) {
  return (
    <header className="mb-5 text-center">
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      {description && <p className="mt-2 text-sm text-muted">{description}</p>}
    </header>
  );
}

type AuthPageProps = Partial<AuthHeaderProps> & {
  children: ReactNode;
  footer?: ReactNode;
};

export default function AuthPage({ title, description, children, footer }: AuthPageProps) {
  return (
    <section className="mx-auto my-auto w-full max-w-sm motion-safe:animate-fade-in-up">
      {title && <AuthHeader title={title} description={description} />}
      {children}
      {footer && <div className="mt-5 text-center text-sm text-muted">{footer}</div>}
    </section>
  );
}
