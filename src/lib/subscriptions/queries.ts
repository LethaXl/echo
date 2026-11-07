import "server-only";
import { cache } from "react";
import { getCurrentUser } from "@/lib/auth/session";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import {
  isPaidPlan,
  type BillingInterval,
  type PlanSettings,
  type ScheduledChange,
  type SubscriptionPlan,
} from "@/lib/subscriptions/plans";
import { createClient } from "@/lib/supabase/server";

export type { BillingInterval, ScheduledChange, SubscriptionPlan };

export type ActiveSubscription = {
  id: string;
  planId: string;
  planName: string;
  /** What this subscription is charged each period, fixed when the plan was chosen. */
  priceCents: number;
  billingInterval: BillingInterval;
  startedAt: string;
  /** When the current billing period ends: the next renewal, or when Echo+ ends if cancelled. */
  currentPeriodEnd: string;
  /** What happens at currentPeriodEnd instead of a normal renewal, if anything. */
  scheduledChange: ScheduledChange | null;
  /** The plan it renews on, for a scheduled switch_plan (annual to monthly). */
  scheduledPlan: ScheduledPlan | null;
};

export type ScheduledPlan = {
  id: string;
  /** The price it renews at, agreed when the switch was scheduled. */
  priceCents: number;
  billingInterval: BillingInterval;
};

/**
 * Users without an active Echo+ subscription are on the free plan, which has no row of its own.
 * `ok: false` means the lookup failed, which must not be mistaken for Free.
 */
export type SubscriptionLookup =
  | { ok: true; subscription: ActiveSubscription | null }
  | { ok: false };

/** The member's most recent subscription that has ended, for offering to subscribe again. */
export type PastSubscription = {
  billingInterval: BillingInterval;
  endedAt: string;
  /** How it ended: cancelled or downgraded, or `null` for older subscriptions that just lapsed. */
  change: ScheduledChange | null;
};

export type SubscriptionEventType =
  | "subscribed"
  | "resubscribed"
  | "upgraded"
  | "renewed"
  | "cancellation_scheduled"
  | "downgrade_scheduled"
  | "switch_scheduled"
  | "switch_cancelled"
  | "switched"
  | "reactivated"
  | "ended";

/** One row of subscription_events, recorded by the database functions. */
export type SubscriptionEvent = {
  id: string;
  type: SubscriptionEventType;
  occurredAt: string;
  /** The period end after the event; for cancellations, when Echo+ ends. */
  periodEnd: string;
  /** The simulated charge, for subscribing, upgrading and renewing. */
  amountCents: number | null;
  billingInterval: BillingInterval;
  /** The plan before an upgrade or plan switch. */
  previousBillingInterval: BillingInterval | null;
};

export type SubscriptionHistory =
  | { ok: true; events: SubscriptionEvent[]; hasMore: boolean }
  | { ok: false };

type PlanRow = {
  id: string;
  name: string;
  description: string | null;
  price_cents: number;
  billing_interval: BillingInterval;
  features: string[];
  is_available: boolean;
  is_free: boolean;
};

type CatalogueRow = Omit<PlanRow, "billing_interval"> & { billing_interval: BillingInterval | null };

type SubscriptionRow = {
  id: string;
  plan_id: string;
  /** `null` for subscriptions from before price snapshots, until their next renewal. */
  price_cents: number | null;
  scheduled_price_cents: number | null;
  started_at: string;
  current_period_end: string;
  scheduled_change: ScheduledChange | null;
  plan: Pick<PlanRow, "name" | "price_cents" | "billing_interval"> | null;
  scheduled_plan: Pick<PlanRow, "id" | "price_cents" | "billing_interval"> | null;
};

type PastSubscriptionRow = {
  status: string;
  current_period_end: string;
  cancelled_at: string | null;
  scheduled_change: ScheduledChange | null;
  plan: Pick<PlanRow, "billing_interval"> | null;
};

/**
 * Every listed plan (Free first, then Echo+ in display order) with its current price, benefits and
 * availability, or `null` if they couldn't be loaded. Plans are public under RLS. This is the one
 * source of plan details for the Plans page, account pages and Admin Panel.
 */
export const getPlanCatalogue = cache(async (): Promise<PlanSettings[] | null> => {
  if (!isSupabaseConfigured()) return null;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("subscription_plans")
    .select("id, name, description, price_cents, billing_interval, features, is_available, is_free")
    .eq("is_active", true)
    .order("sort_order")
    .overrideTypes<CatalogueRow[], { merge: false }>();

  if (error) {
    console.error("Failed to load subscription plans:", error.message);
    return null;
  }

  return data.map((plan) => ({
    id: plan.id,
    name: plan.name,
    description: plan.description,
    priceCents: plan.price_cents,
    billingInterval: plan.billing_interval,
    features: plan.features,
    isAvailable: plan.is_available,
    isFree: plan.is_free,
  }));
});

/** Echo+ plans in display order, including unavailable ones, or `null` if they couldn't be loaded. */
export async function getSubscriptionPlans(): Promise<SubscriptionPlan[] | null> {
  return (await getPlanCatalogue())?.filter(isPaidPlan) ?? null;
}

/** The Free plan's details, or `null` if they couldn't be loaded. */
export async function getFreePlan(): Promise<PlanSettings | null> {
  return (await getPlanCatalogue())?.find((plan) => plan.isFree) ?? null;
}

async function selectActiveSubscription(userId: string) {
  const supabase = await createClient();
  return supabase
    .from("subscriptions")
    .select(
      // Two columns reference subscription_plans, so each embed names the one it follows.
      "id, plan_id, price_cents, scheduled_price_cents, started_at, current_period_end, scheduled_change, plan:subscription_plans!plan_id(name, price_cents, billing_interval), scheduled_plan:subscription_plans!scheduled_plan_id(id, price_cents, billing_interval)",
    )
    .eq("user_id", userId)
    .eq("status", "active")
    .maybeSingle<SubscriptionRow>();
}

const hasEnded = (periodEnd: string) => new Date(periodEnd) <= new Date();

/**
 * The user's Echo+ subscription. If its period has ended, the database renews it (or ends it, if
 * a cancellation or downgrade was scheduled) before it's returned, so dates are always current.
 * RLS only returns the caller's own rows.
 */
export const lookUpSubscription = cache(async (userId: string): Promise<SubscriptionLookup> => {
  let { data, error } = await selectActiveSubscription(userId);

  if (!error && data && hasEnded(data.current_period_end)) {
    const supabase = await createClient();
    const { error: syncError } = await supabase.rpc("sync_my_subscription");
    if (syncError) {
      console.error("Failed to renew subscription:", syncError.message);
      return { ok: false };
    }
    ({ data, error } = await selectActiveSubscription(userId));
  }

  if (error) {
    console.error("Failed to load subscription:", error.message);
    return { ok: false };
  }

  if (!data?.plan || hasEnded(data.current_period_end)) return { ok: true, subscription: null };

  return {
    ok: true,
    subscription: {
      id: data.id,
      planId: data.plan_id,
      planName: data.plan.name,
      // Without a snapshot, the next renewal charges the plan's price and fixes it from then on.
      priceCents: data.price_cents ?? data.plan.price_cents,
      billingInterval: data.plan.billing_interval,
      startedAt: data.started_at,
      currentPeriodEnd: data.current_period_end,
      scheduledChange: data.scheduled_change,
      scheduledPlan: data.scheduled_plan && {
        id: data.scheduled_plan.id,
        priceCents: data.scheduled_price_cents ?? data.scheduled_plan.price_cents,
        billingInterval: data.scheduled_plan.billing_interval,
      },
    },
  };
});

const HISTORY_LIMIT = 50;

type SubscriptionEventRow = {
  id: string;
  event_type: SubscriptionEventType;
  amount_cents: number | null;
  period_end: string;
  occurred_at: string;
  plan: Pick<PlanRow, "billing_interval"> | null;
  previous_plan: Pick<PlanRow, "billing_interval"> | null;
};

// A switch and the first renewal on the new plan share a timestamp; the switch came first.
const sameTimeOrder: Partial<Record<SubscriptionEventType, number>> = { switched: -1 };

/**
 * The user's subscription events, newest first. Call after lookUpSubscription so renewals that
 * were due are already recorded.
 */
export async function getSubscriptionHistory(userId: string): Promise<SubscriptionHistory> {
  const supabase = await createClient();
  // Filter by user as well as RLS: admins can read everyone's events.
  const { data, error } = await supabase
    .from("subscription_events")
    .select(
      "id, event_type, amount_cents, period_end, occurred_at, plan:subscription_plans!plan_id(billing_interval), previous_plan:subscription_plans!previous_plan_id(billing_interval)",
    )
    .eq("user_id", userId)
    .order("occurred_at", { ascending: false })
    .limit(HISTORY_LIMIT + 1)
    .overrideTypes<SubscriptionEventRow[], { merge: false }>();

  if (error) {
    console.error("Failed to load subscription history:", error.message);
    return { ok: false };
  }

  const events = data
    .slice(0, HISTORY_LIMIT)
    .flatMap(({ plan, ...row }): SubscriptionEvent[] =>
      plan
        ? [
            {
              id: row.id,
              type: row.event_type,
              occurredAt: row.occurred_at,
              periodEnd: row.period_end,
              amountCents: row.amount_cents,
              billingInterval: plan.billing_interval,
              previousBillingInterval: row.previous_plan?.billing_interval ?? null,
            },
          ]
        : [],
    )
    .sort(
      (a, b) =>
        Date.parse(b.occurredAt) - Date.parse(a.occurredAt) ||
        (sameTimeOrder[b.type] ?? 0) - (sameTimeOrder[a.type] ?? 0),
    );

  return { ok: true, events, hasMore: data.length > HISTORY_LIMIT };
}

/** Call after lookUpSubscription, which ends any subscription that's due. */
export async function getPastSubscription(userId: string): Promise<PastSubscription | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("subscriptions")
    .select(
      "status, current_period_end, cancelled_at, scheduled_change, plan:subscription_plans!plan_id(billing_interval)",
    )
    .eq("user_id", userId)
    .neq("status", "active")
    .order("current_period_end", { ascending: false })
    .limit(1)
    .maybeSingle<PastSubscriptionRow>();

  if (error) {
    console.error("Failed to load past subscription:", error.message);
    return null;
  }
  if (!data?.plan) return null;

  // Subscriptions cancelled before US-28 ended immediately rather than at the period end.
  const endedAt =
    data.status === "cancelled" && data.cancelled_at ? data.cancelled_at : data.current_period_end;
  return { billingInterval: data.plan.billing_interval, endedAt, change: data.scheduled_change };
}

/** The user's active Echo+ subscription, or `null` for the free plan (or if it couldn't be loaded). */
export async function getActiveSubscription(userId: string): Promise<ActiveSubscription | null> {
  const lookup = await lookUpSubscription(userId);
  return lookup.ok ? lookup.subscription : null;
}

/** The signed-in user's active Echo+ subscription; always `null` for visitors. */
export async function getCurrentSubscription(): Promise<ActiveSubscription | null> {
  const user = await getCurrentUser();
  return user ? getActiveSubscription(user.id) : null;
}

/**
 * Whether the signed-in user has Echo+. Monthly and annual plans grant the same access, and a
 * cancelled or downgraded subscription keeps it until its period ends.
 * Use this for every Echo+ check so access always comes from Supabase, never from the client.
 */
export async function hasEchoPlus(): Promise<boolean> {
  return (await getCurrentSubscription()) !== null;
}
