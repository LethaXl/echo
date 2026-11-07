/**
 * Validation for the plan settings admins edit (US-59, US-60), shared by the edit form and the
 * server action. The database enforces the same limits in 20261108000000_plan_management.sql.
 */

export const MAX_BENEFITS = 12;
export const MAX_BENEFIT_LENGTH = 120;
export const MAX_PRICE_CENTS = 99_999;

/** Collapses runs of whitespace and trims the ends. */
export function normalizeBenefit(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

/** A message for each benefit that can't be saved, in the same order; `null` where it's fine. */
export function benefitErrors(benefits: string[]): (string | null)[] {
  const seen = new Set<string>();
  return benefits.map((raw) => {
    const benefit = normalizeBenefit(raw);
    if (!benefit) return "Enter the benefit or remove it.";
    if (benefit.length > MAX_BENEFIT_LENGTH) {
      return `Keep each benefit to ${MAX_BENEFIT_LENGTH} characters or fewer.`;
    }
    const key = benefit.toLowerCase();
    if (seen.has(key)) return "This benefit is already listed.";
    seen.add(key);
    return null;
  });
}

export function benefitListError(benefits: string[]): string | null {
  if (benefits.length === 0) return "Add at least one benefit.";
  if (benefits.length > MAX_BENEFITS) return `A plan can list up to ${MAX_BENEFITS} benefits.`;
  return null;
}

export function validateBenefits(
  raw: string[],
): { ok: true; benefits: string[] } | { ok: false; message: string } {
  const message = benefitListError(raw) ?? benefitErrors(raw).find((error) => error !== null);
  return message ? { ok: false, message } : { ok: true, benefits: raw.map(normalizeBenefit) };
}

/**
 * Parses a dollar amount such as "12", "12.5" or "$12.99" into cents without floating-point maths.
 */
export function validatePrice(
  input: string,
): { ok: true; cents: number } | { ok: false; message: string } {
  const value = input.trim().replace(/^\$/, "");
  if (!value) return { ok: false, message: "Enter a price." };

  const match = /^(\d+)(?:\.(\d{1,2}))?$/.exec(value);
  if (!match) {
    return { ok: false, message: "Enter a price like 9.99, with up to two decimal places." };
  }

  const cents = Number(match[1]) * 100 + Number((match[2] ?? "").padEnd(2, "0"));
  if (cents > MAX_PRICE_CENTS) {
    return { ok: false, message: `Enter a price of $${MAX_PRICE_CENTS / 100} or less.` };
  }
  return { ok: true, cents };
}

/** 999 → "9.99", for prefilling the price field. */
export function formatPriceInput(cents: number): string {
  return `${Math.floor(cents / 100)}.${String(cents % 100).padStart(2, "0")}`;
}
