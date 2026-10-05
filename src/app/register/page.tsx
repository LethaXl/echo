import type { Metadata } from "next";
import PlaceholderPage from "@/components/PlaceholderPage";

export const metadata: Metadata = { title: "Sign Up" };

export default function RegisterPage() {
  return (
    <PlaceholderPage
      title="Sign Up"
      description="Account creation will be handled by Supabase Auth."
      plannedStories={["US-01 Create an Account"]}
    />
  );
}
