export const APP_NAME = "Echo";
export const SUBSCRIBER_APP_NAME = "Echo+";

export type MembershipTier = "echo" | "echo-plus";

export function getBrandName(tier: MembershipTier): string {
  return tier === "echo-plus" ? SUBSCRIBER_APP_NAME : APP_NAME;
}
