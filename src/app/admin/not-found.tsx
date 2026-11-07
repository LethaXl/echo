import ButtonLink from "@/components/ButtonLink";

// Shown to signed-in members who aren't admins, so the admin pages don't reveal themselves.
export default function AdminNotFound() {
  return (
    <div className="mt-10 max-w-md">
      <h1 className="text-2xl font-semibold tracking-tight">We couldn&apos;t find that page</h1>
      <p className="mt-2 text-muted">The link may be wrong, or the page may no longer exist.</p>
      <ButtonLink href="/" variant="secondary" className="mt-6">
        Back to Home
      </ButtonLink>
    </div>
  );
}
