import type { Metadata } from "next";
import { requireAdmin } from "@/lib/admin/access";

export const metadata: Metadata = { title: "Admin Panel", robots: { index: false, follow: false } };

// Each section is built in a later Sprint 4 story.
const sections = [
  {
    title: "Content Management",
    description: "Manage movies, television shows, seasons and episodes.",
  },
  {
    title: "Subscription Plans",
    description: "Manage subscription plan availability, benefits and pricing.",
  },
  {
    title: "User Management",
    description: "View and manage registered user accounts.",
  },
  {
    title: "Subscription Overview",
    description: "View subscription statistics and account distribution.",
  },
];

// US-49 Access the Admin Dashboard
export default async function AdminPage() {
  // Checked on the server for every request; hiding the menu item alone wouldn't protect this.
  await requireAdmin("/admin");

  return (
    <div className="flex flex-1 flex-col justify-center motion-safe:animate-fade-in-up">
      <h1 className="sr-only">Admin Panel</h1>
      <ul className="mx-auto flex w-full max-w-xl flex-col gap-3">
        {sections.map((section) => (
          <li
            key={section.title}
            className="group rounded-xl border border-line bg-surface px-8 py-6 text-center transition-colors duration-150 hover:border-accent/40 hover:bg-elevated"
          >
            <h2 className="text-[1.0625rem] font-semibold tracking-tight transition-colors duration-150 group-hover:text-accent-hover">
              {section.title}
            </h2>
            <p className="mt-1.5 text-sm text-muted">{section.description}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
