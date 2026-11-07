/**
 * Field-level overrides admins can set on TMDB content (US-52, US-56), shared by the edit dialogs
 * and the server actions. A stored key replaces TMDB's value, even when it's "" (deliberately
 * blank); a missing key means TMDB's value. The database enforces the same rules in
 * 20261109000000_content_management.sql.
 */

export type FieldKind = "text" | "textarea" | "date" | "list" | "image";

/** The tab a field appears under in the edit dialog. */
export type FieldSection = "general" | "details" | "artwork";

export const FIELD_SECTIONS: { key: FieldSection; label: string }[] = [
  { key: "general", label: "General" },
  { key: "details", label: "Details" },
  { key: "artwork", label: "Artwork" },
];

export type OverrideField = {
  key: string;
  label: string;
  kind: FieldKind;
  section: FieldSection;
  /** Max characters, or for lists the max per item. */
  max: number;
  required?: boolean;
};

/** A stored override: a string, or a list for genres. */
export type OverrideValue = string | string[];
export type Overrides = Record<string, OverrideValue>;

const MAX_LIST_ITEMS = 10;

export const TITLE_FIELDS: OverrideField[] = [
  { key: "title", label: "Title", kind: "text", section: "general", max: 200, required: true },
  { key: "tagline", label: "Tagline", kind: "text", section: "general", max: 300 },
  { key: "overview", label: "Description", kind: "textarea", section: "details", max: 4000 },
  { key: "date", label: "Release date", kind: "date", section: "details", max: 10 },
  { key: "genres", label: "Genres", kind: "list", section: "details", max: 40 },
  { key: "posterPath", label: "Poster", kind: "image", section: "artwork", max: 100 },
  { key: "backdropPath", label: "Backdrop", kind: "image", section: "artwork", max: 100 },
];

export const EPISODE_FIELDS: OverrideField[] = [
  { key: "name", label: "Title", kind: "text", section: "general", max: 200, required: true },
  { key: "overview", label: "Description", kind: "textarea", section: "details", max: 4000 },
  { key: "airDate", label: "Air date", kind: "date", section: "details", max: 10 },
  { key: "stillPath", label: "Still image", kind: "image", section: "artwork", max: 100 },
];

/** How a value appears in its form field: lists comma-separated, nothing as "". */
export function toInput(value: OverrideValue | null | undefined): string {
  if (Array.isArray(value)) return value.join(", ");
  return value ?? "";
}

const IMAGE_PATH = /^\/[A-Za-z0-9_-]{1,100}\.(jpg|jpeg|png|webp|svg)$/;
const TMDB_IMAGE_URL = /^https:\/\/image\.tmdb\.org\/t\/p\/[a-z0-9]+(\/[A-Za-z0-9_-]{1,100}\.(jpg|jpeg|png|webp|svg))$/;

/** The TMDB image path an image field's input refers to, or `null` when it isn't one. */
export function imagePath(raw: string): string | null {
  const input = raw.trim();
  const path = TMDB_IMAGE_URL.exec(input)?.[1] ?? input;
  return IMAGE_PATH.test(path) ? path : null;
}

function isCalendarDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

type ParseResult = { ok: true; value: OverrideValue } | { ok: false; message: string };

/** Validates one field's input and returns the value to store. */
export function parseField(field: OverrideField, raw: string): ParseResult {
  const input = raw.trim();
  switch (field.kind) {
    case "date":
      if (input && !isCalendarDate(input)) return { ok: false, message: "Enter a valid date." };
      return { ok: true, value: input };
    case "image": {
      if (!input) return { ok: true, value: "" };
      const path = imagePath(input);
      if (!path) return { ok: false, message: "Enter a TMDB image path such as /abc123.jpg." };
      return { ok: true, value: path };
    }
    case "list": {
      const seen = new Set<string>();
      const items = input
        .split(",")
        .map((item) => item.replace(/\s+/g, " ").trim())
        .filter((item) => {
          const key = item.toLowerCase();
          if (!item || seen.has(key)) return false;
          seen.add(key);
          return true;
        });
      if (items.length > MAX_LIST_ITEMS) {
        return { ok: false, message: `List up to ${MAX_LIST_ITEMS} ${field.label.toLowerCase()}.` };
      }
      if (items.some((item) => item.length > field.max)) {
        return { ok: false, message: `Keep each one to ${field.max} characters or fewer.` };
      }
      return { ok: true, value: items };
    }
    default:
      if (field.required && !input) return { ok: false, message: `Enter a ${field.label.toLowerCase()}.` };
      if (input.length > field.max) {
        return { ok: false, message: `Keep it to ${field.max} characters or fewer.` };
      }
      return { ok: true, value: input };
  }
}

/**
 * The overrides to store: only fields whose input differs from TMDB's value. A field left as
 * TMDB has it, or reset to it, stores nothing, so it follows TMDB again.
 */
export function buildOverrides(
  fields: OverrideField[],
  tmdbValues: Record<string, OverrideValue | null>,
  inputs: Record<string, string>,
): { ok: true; overrides: Overrides } | { ok: false; message: string; field: string } {
  const overrides: Overrides = {};
  for (const field of fields) {
    const raw = inputs[field.key] ?? "";
    const tmdbInput = toInput(tmdbValues[field.key]);
    if (raw.trim() === tmdbInput.trim()) continue;

    const parsed = parseField(field, raw);
    if (!parsed.ok) return { ok: false, message: parsed.message, field: field.key };
    if (toInput(parsed.value) !== tmdbInput.trim()) overrides[field.key] = parsed.value;
  }
  return { ok: true, overrides };
}

/** Reads stored overrides defensively, keeping only string or string-list values. */
export function readOverrides(value: unknown): Overrides {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const overrides: Overrides = {};
  for (const [key, item] of Object.entries(value)) {
    if (typeof item === "string") overrides[key] = item;
    else if (Array.isArray(item) && item.every((entry) => typeof entry === "string")) overrides[key] = item;
  }
  return overrides;
}
