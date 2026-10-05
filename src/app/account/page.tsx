import type { Metadata } from "next";
import PlaceholderPage from "@/components/PlaceholderPage";

export const metadata: Metadata = { title: "Account" };

export default function AccountPage() {
  return (
    <PlaceholderPage
      title="Account"
      description="Signed-in users will manage their account details here."
      plannedStories={[
        "US-03 Log Out",
        "US-05 Change My Password",
        "US-06 View Account Details",
        "US-07 Update My Name",
        "US-08 Delete My Account",
      ]}
    />
  );
}
