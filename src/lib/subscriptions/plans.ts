import { APP_NAME } from "@/lib/brand";

export type BillingInterval = "month" | "year";

export const BILLING_PERIODS: Record<BillingInterval, { label: string; unit: string }> = {
  month: { label: "Monthly", unit: "month" },
  year: { label: "Annual", unit: "year" },
};

/** Everyone without an active Echo+ subscription is on this plan. */
export const FREE_PLAN_NAME = APP_NAME;

/** Subscriptions are simulated, so this is the only payment method and nothing is charged. */
export const SIMULATED_PAYMENT_METHOD = "Default Card";

/**
 * A change that takes effect when the current period ends: cancel or downgrade (Echo+ ends), or
 * switch_plan (renews on another plan, e.g. annual to monthly).
 */
export type ScheduledChange = "cancel" | "downgrade" | "switch_plan";

/**
 * A row of subscription_plans: the Free plan or an Echo+ plan. `features` are the benefits shown to
 * members; they're display text only and never decide what a member can access.
 */
export type PlanSettings = {
  id: string;
  name: string;
  description: string | null;
  priceCents: number;
  /** `null` only for the Free plan. */
  billingInterval: BillingInterval | null;
  features: string[];
  /** Whether new members can choose it. The Free plan is always available. */
  isAvailable: boolean;
  isFree: boolean;
};

export type SubscriptionPlan = PlanSettings & { billingInterval: BillingInterval; isFree: false };

export function isPaidPlan(plan: PlanSettings): plan is SubscriptionPlan {
  return !plan.isFree && plan.billingInterval !== null;
}

/** One way to pay for Echo+, e.g. monthly. */
export type BillingOption = {
  planId: string;
  interval: BillingInterval;
  label: string;
  unit: string;
  priceCents: number;
  description: string;
  features: string[];
  /** Whether it can be chosen now; unavailable plans stay listed. */
  available: boolean;
  /** Savings over a year of the monthly option, in cents. */
  savingsCents: number;
};

export function toBillingOptions(plans: SubscriptionPlan[]): BillingOption[] {
  const monthly = plans.find((plan) => plan.billingInterval === "month");
  return plans.map((plan) => {
    const period = BILLING_PERIODS[plan.billingInterval];
    return {
      planId: plan.id,
      interval: plan.billingInterval,
      label: period.label,
      unit: period.unit,
      priceCents: plan.priceCents,
      description: plan.description ?? `Full ${APP_NAME}+ access, billed every ${period.unit}.`,
      features: plan.features,
      available: plan.isAvailable,
      savingsCents:
        plan.billingInterval === "year" && monthly
          ? Math.max(0, monthly.priceCents * 12 - plan.priceCents)
          : 0,
    };
  });
}

/**
 * One billing period after `date`, matching the database's renewal dates: a month or year later,
 * clamped to the end of a shorter month (Jan 31 + 1 month = Feb 28, Feb 29 + 1 year = Feb 28).
 */
export function addBillingPeriod(date: Date, interval: BillingInterval): Date {
  const result = new Date(date);
  const day = result.getUTCDate();
  result.setUTCDate(1);
  if (interval === "year") result.setUTCFullYear(result.getUTCFullYear() + 1);
  else result.setUTCMonth(result.getUTCMonth() + 1);
  const daysInMonth = new Date(
    Date.UTC(result.getUTCFullYear(), result.getUTCMonth() + 1, 0),
  ).getUTCDate();
  result.setUTCDate(Math.min(day, daysInMonth));
  return result;
}

/** The `?billing=` value on /plans, e.g. after logging in to subscribe. */
export function billingParam(interval: BillingInterval): string {
  return interval === "year" ? "annual" : "monthly";
}

export function parseBillingParam(value: unknown): BillingInterval | null {
  if (value === "annual") return "year";
  if (value === "monthly") return "month";
  return null;
}
