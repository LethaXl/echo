"use server";

import type { PostgrestError } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  GENERIC_ERROR_MESSAGE,
  getAuthErrorMessage,
  NOT_CONFIGURED_MESSAGE,
} from "@/lib/auth/errors";
import type { FormState } from "@/lib/auth/form-state";
import { getPassword, getText } from "@/lib/auth/validation";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createClient, createIsolatedClient } from "@/lib/supabase/server";
import { getSubscriptionPlans, lookUpSubscription } from "./queries";

const ACCOUNT_SUBSCRIPTION_PATH = "/account?tab=subscription";

const ALREADY_SUBSCRIBED_MESSAGE = "You already have an active Echo+ subscription.";
const PLAN_UNAVAILABLE_MESSAGE = "That plan isn't available right now. Refresh the page and try again.";
const NO_SUBSCRIPTION_MESSAGE =
  "You don't have an active Echo+ subscription anymore. Refresh the page to see your plan.";
const CONFIRM_PASSWORD_AGAIN_MESSAGE = "Please confirm your password again.";

/** What the subscription functions in the database return. */
type SubscriptionRow = { id: string; current_period_end: string };

type IsolatedClient = ReturnType<typeof createIsolatedClient>;

function errorState(message: string, field?: string): FormState {
  return { status: "error", message, field };
}

/**
 * Turns an error raised by a subscription function into a message, using the codes listed in
 * supabase/migrations/20261011000000_subscription_management.sql.
 */
function rpcErrorState(
  error: PostgrestError,
  action: string,
  messages: Record<string, FormState>,
): FormState {
  const known = messages[error.code];
  if (known) return known;
  console.error(`Failed to ${action}:`, error.code, error.message);
  return errorState(GENERIC_ERROR_MESSAGE);
}

async function getSignedInUser(next: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) redirect(`/login?next=${encodeURIComponent(next)}`);
  return { supabase, user: { id: user.id, email: user.email } };
}

/**
 * Checks the password on a separate in-memory session, so the visitor's own session is left
 * alone, then makes the change on that just-verified session; the database only accepts
 * subscribing and upgrading from a session that signed in with a password moments ago.
 * The password is never stored or logged.
 */
async function withConfirmedPassword(
  user: { id: string; email: string },
  password: string,
  change: (verified: IsolatedClient) => Promise<FormState>,
): Promise<FormState> {
  const verifier = createIsolatedClient();
  const { data, error } = await verifier.auth.signInWithPassword({
    email: user.email,
    password,
  });

  if (error) {
    return error.code === "invalid_credentials"
      ? errorState("That password is incorrect.", "password")
      : errorState(getAuthErrorMessage(error));
  }

  try {
    if (data.user.id !== user.id) return errorState(GENERIC_ERROR_MESSAGE);
    return await change(verifier);
  } finally {
    // Ends the confirmation session; the visitor stays signed in on their own.
    await verifier.auth.signOut({ scope: "local" });
  }
}

function finish(result: FormState): FormState {
  if (result.status === "success") revalidatePath("/", "layout");
  return result;
}

// US-24 Subscribe to a Plan, US-29 Subscribe Again (simulated: no payment is taken)
export async function subscribe(_prevState: FormState, formData: FormData): Promise<FormState> {
  const planId = getText(formData, "planId");
  const password = getPassword(formData, "password");

  if (!password) return errorState("Enter your password to confirm.", "password");
  if (!isSupabaseConfigured()) return errorState(NOT_CONFIGURED_MESSAGE);

  const { user } = await getSignedInUser("/plans");

  const plan = (await getSubscriptionPlans())?.find((option) => option.id === planId);
  if (!plan) return errorState(PLAN_UNAVAILABLE_MESSAGE);

  const existing = await lookUpSubscription(user.id);
  if (!existing.ok) return errorState(GENERIC_ERROR_MESSAGE);
  if (existing.subscription) return errorState(ALREADY_SUBSCRIBED_MESSAGE);

  return finish(
    await withConfirmedPassword(user, password, async (verified) => {
      const { data, error } = await verified.rpc("start_subscription", { p_plan_id: plan.id });
      if (error) {
        return rpcErrorState(error, "start subscription", {
          "23505": errorState(ALREADY_SUBSCRIBED_MESSAGE),
          P0002: errorState(PLAN_UNAVAILABLE_MESSAGE),
          "42501": errorState(CONFIRM_PASSWORD_AGAIN_MESSAGE, "password"),
        });
      }

      const started = data as SubscriptionRow | null;
      if (!started?.current_period_end) return errorState(GENERIC_ERROR_MESSAGE);
      return {
        status: "success",
        message: `You're now on ${plan.name}.`,
        values: { planName: plan.name, renewsAt: started.current_period_end },
      };
    }),
  );
}

// US-26 Upgrade Subscription: monthly to annual, effective immediately (simulated, no proration)
export async function upgradeSubscription(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const planId = getText(formData, "planId");
  const password = getPassword(formData, "password");

  if (!password) return errorState("Enter your password to confirm.", "password");
  if (!isSupabaseConfigured()) return errorState(NOT_CONFIGURED_MESSAGE);

  const { user } = await getSignedInUser(ACCOUNT_SUBSCRIPTION_PATH);

  const plan = (await getSubscriptionPlans())?.find((option) => option.id === planId);
  if (!plan) return errorState(PLAN_UNAVAILABLE_MESSAGE);

  const existing = await lookUpSubscription(user.id);
  if (!existing.ok) return errorState(GENERIC_ERROR_MESSAGE);
  if (!existing.subscription) return errorState(NO_SUBSCRIPTION_MESSAGE);
  if (existing.subscription.planId === plan.id) {
    return errorState(`You're already on ${plan.name}.`);
  }
  if (existing.subscription.billingInterval !== "month" || plan.billingInterval !== "year") {
    return errorState("Only monthly plans can be upgraded to annual.");
  }

  return finish(
    await withConfirmedPassword(user, password, async (verified) => {
      const { data, error } = await verified.rpc("upgrade_subscription", { p_plan_id: plan.id });
      if (error) {
        return rpcErrorState(error, "upgrade subscription", {
          "23505": errorState(`You're already on ${plan.name}.`),
          P0002: errorState(PLAN_UNAVAILABLE_MESSAGE),
          ES001: errorState(NO_SUBSCRIPTION_MESSAGE),
          ES003: errorState("Only monthly plans can be upgraded to annual."),
          "42501": errorState(CONFIRM_PASSWORD_AGAIN_MESSAGE, "password"),
        });
      }

      const upgraded = data as SubscriptionRow | null;
      if (!upgraded?.current_period_end) return errorState(GENERIC_ERROR_MESSAGE);
      return {
        status: "success",
        message: `You're now on ${plan.name}.`,
        values: { planName: plan.name, renewsAt: upgraded.current_period_end },
      };
    }),
  );
}

// Annual to monthly, from the next renewal (no password: nothing is charged until then)
export async function switchSubscriptionPlan(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const planId = getText(formData, "planId");
  if (!isSupabaseConfigured()) return errorState(NOT_CONFIGURED_MESSAGE);

  const { supabase } = await getSignedInUser(ACCOUNT_SUBSCRIPTION_PATH);
  const { data, error } = await supabase.rpc("switch_subscription_plan", { p_plan_id: planId });

  if (error) {
    return rpcErrorState(error, "switch plan", {
      "23505": errorState("You're already on that plan."),
      P0002: errorState(PLAN_UNAVAILABLE_MESSAGE),
      ES001: errorState(NO_SUBSCRIPTION_MESSAGE),
      ES002: errorState("A change to your plan is already scheduled. Refresh the page to see it."),
      ES003: errorState("Only annual plans can be downgraded to monthly."),
    });
  }

  const switching = data as SubscriptionRow | null;
  if (!switching?.current_period_end) return errorState(GENERIC_ERROR_MESSAGE);
  return finish({
    status: "success",
    message: "Your downgrade to monthly billing is scheduled.",
    values: { switchesAt: switching.current_period_end },
  });
}

// US-28 Cancel My Subscription: stops renewal and keeps Echo+ until the current period ends
export async function cancelSubscription(): Promise<FormState> {
  if (!isSupabaseConfigured()) return errorState(NOT_CONFIGURED_MESSAGE);

  const { supabase } = await getSignedInUser(ACCOUNT_SUBSCRIPTION_PATH);
  const { data, error } = await supabase.rpc("cancel_subscription");

  if (error) {
    return rpcErrorState(error, "cancel subscription", {
      ES001: errorState(NO_SUBSCRIPTION_MESSAGE),
      ES002: errorState(
        "Your subscription is already set to end. Refresh the page to see the details.",
      ),
    });
  }

  const ending = data as SubscriptionRow | null;
  if (!ending?.current_period_end) return errorState(GENERIC_ERROR_MESSAGE);
  return finish({
    status: "success",
    message: "Your subscription has been cancelled.",
    values: { endsAt: ending.current_period_end },
  });
}

// US-29 Subscribe Again, while a cancellation is still pending (also undoes a plan switch)
export async function resumeSubscription(): Promise<FormState> {
  if (!isSupabaseConfigured()) return errorState(NOT_CONFIGURED_MESSAGE);

  const { supabase } = await getSignedInUser(ACCOUNT_SUBSCRIPTION_PATH);
  const { data, error } = await supabase.rpc("resume_subscription");

  if (error) {
    return rpcErrorState(error, "resume subscription", {
      ES001: errorState(
        "Your Echo+ subscription has already ended. Choose a plan to subscribe again.",
      ),
      ES002: errorState("Your plan already renews as it is."),
    });
  }

  const resumed = data as SubscriptionRow | null;
  if (!resumed?.current_period_end) return errorState(GENERIC_ERROR_MESSAGE);
  return finish({
    status: "success",
    message: "Your plan will renew as it is.",
    values: { renewsAt: resumed.current_period_end },
  });
}
