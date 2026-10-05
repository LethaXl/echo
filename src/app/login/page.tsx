import type { Metadata } from "next";
import PlaceholderPage from "@/components/PlaceholderPage";

export const metadata: Metadata = { title: "Log In" };

export default function LoginPage() {
  return (
    <PlaceholderPage
      title="Log In"
      description="Logging in will be handled by Supabase Auth."
      plannedStories={["US-02 Log In", "US-04 Reset a Forgotten Password"]}
    />
  );
}
