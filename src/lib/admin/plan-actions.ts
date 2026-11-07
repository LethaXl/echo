"use server";

import { revalidatePath } from "next/cache";
import { GENERIC_ERROR_MESSAGE, NOT_CONFIGURED_MESSAGE } from "@/lib/auth/errors";
import type { FormState } from "@/lib/auth/form-state";
import { getText } from "@/lib/auth/validation";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import { validateBenefits, validatePrice } from "@/lib/subscriptions/plan-settings";
import { getPlanCatalogue } from "@/lib/subscriptions/queries";
import { isCurrentUserAdmin } from "./access";

const NOT_ALLOWED_MESSAGE = "You don't have permission to change subscription plans.";
const PLAN_NOT_FOUND_MESSAGE = "That plan couldn't be found. Refresh the page and try again.";
const INVALID_CHANGES_MESSAGE = "Those changes couldn't be saved. Check the plan details and try again.";

function errorState(message: string, field?: string): FormState {
  return { status: "error", message, field };
}

type PlanChanges = { features?: string[]; price_cents?: number; is_available?: boolean };

/**
 * Checks the caller is an admin, then finds the plan. The database checks admin access again
 * through RLS when the change is saved, so this is for clear messages, not the only guard.
 */
async function findPlanForAdmin(formData: FormData) {
  if (!isSupabaseConfigured()) return { ok: false as const, state: errorState(NOT_CONFIGURED_MESSAGE) };
  if (!(await isCurrentUserAdmin())) return { ok: false as const, state: errorState(NOT_ALLOWED_MESSAGE) };

  const planId = getText(formData, "planId");
  const catalogue = await getPlanCatalogue();
  if (!catalogue) return { ok: false as const, state: errorState(GENERIC_ERROR_MESSAGE) };

  const plan = catalogue.find((option) => option.id === planId);
  if (!plan) return { ok: false as const, state: errorState(PLAN_NOT_FOUND_MESSAGE) };
  return { ok: true as const, plan };
}

/** Saves every change or none of them, as a single update. */
async function savePlan(planId: string, changes: PlanChanges, action: string): Promise<FormState> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("subscription_plans")
    .update(changes)
    .eq("id", planId)
    .select("id")
    .maybeSingle();

  if (error) {
    if (error.code === "23514") return errorState(INVALID_CHANGES_MESSAGE);
    if (error.code === "42501") return errorState(NOT_ALLOWED_MESSAGE);
    console.error(`Failed to ${action}:`, error.code, error.message);
    return errorState(GENERIC_ERROR_MESSAGE);
  }
  // RLS hides the row from the update when the caller isn't an admin.
  if (!data) return errorState(NOT_ALLOWED_MESSAGE);

  revalidatePath("/", "layout");
  return { status: "success" };
}

// US-59 Edit Plan Benefits, US-60 Edit Plan Prices
export async function updatePlanSettings(
  _previousState: FormState,
  formData: FormData,
): Promise<FormState> {
  const found = await findPlanForAdmin(formData);
  if (!found.ok) return found.state;
  const { plan } = found;

  const benefits = validateBenefits(formData.getAll("benefit").map(String));
  if (!benefits.ok) return errorState(benefits.message, "benefits");

  const changes: PlanChanges = { features: benefits.benefits };

  // The free plan is always free; its price is never read from the form.
  if (!plan.isFree) {
    const price = validatePrice(getText(formData, "price"));
    if (!price.ok) return errorState(price.message, "price");
    changes.price_cents = price.cents;
  }

  return savePlan(plan.id, changes, "update plan settings");
}

// US-58 Enable or Disable Plans
export async function setPlanAvailability(
  _previousState: FormState,
  formData: FormData,
): Promise<FormState> {
  const found = await findPlanForAdmin(formData);
  if (!found.ok) return found.state;
  const { plan } = found;

  if (plan.isFree) return errorState(`${plan.name} is always available.`);

  const available = getText(formData, "available");
  if (available !== "true" && available !== "false") return errorState(GENERIC_ERROR_MESSAGE);

  return savePlan(plan.id, { is_available: available === "true" }, "change plan availability");
}
