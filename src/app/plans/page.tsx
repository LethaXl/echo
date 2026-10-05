import type { Metadata } from "next";
import EchoPlus from "@/components/EchoPlus";
import PlaceholderPage from "@/components/PlaceholderPage";

export const metadata: Metadata = { title: "Plans" };

export default function PlansPage() {
  return (
    <PlaceholderPage
      title="Plans"
      description={
        <>
          <EchoPlus /> subscription plans will be listed here. Subscriptions
          are simulated; no real payments are processed.
        </>
      }
      plannedStories={[
        "US-14 See Subscription Requirements",
        "US-23 Compare Subscription Plans",
      ]}
    />
  );
}
