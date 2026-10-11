const dateFormatter = new Intl.DateTimeFormat("en-CA", {
  dateStyle: "long",
  timeZone: "America/Toronto",
});

export function formatDate(value: string | Date): string {
  return dateFormatter.format(typeof value === "string" ? new Date(value) : value);
}

// TMDB dates are plain calendar days ("2021-03-03"); formatting them in UTC keeps the day intact.
const calendarDateFormatter = new Intl.DateTimeFormat("en-CA", {
  dateStyle: "long",
  timeZone: "UTC",
});

export function formatCalendarDate(isoDate: string): string {
  return calendarDateFormatter.format(new Date(isoDate));
}

export function isFutureCalendarDate(isoDate: string): boolean {
  return isoDate > new Date().toISOString().slice(0, 10);
}

/** 148 → "2h 28m", 45 → "45m". */
export function formatRuntime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours === 0) return `${rest}m`;
  return rest === 0 ? `${hours}h` : `${hours}h ${rest}m`;
}

const languageNames = new Intl.DisplayNames(["en"], { type: "language" });

/** ISO 639-1 code → English name, e.g. "ko" → "Korean". */
export function formatLanguage(code: string): string {
  try {
    return languageNames.of(code) ?? code;
  } catch {
    return code;
  }
}

const countFormatter = new Intl.NumberFormat("en-CA");

export function formatCount(value: number): string {
  return countFormatter.format(value);
}

const priceFormatter = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

/** 999 → "$9.99". */
export function formatPrice(cents: number): string {
  return priceFormatter.format(cents / 100);
}

export function formatEpisodeCount(count: number): string {
  return `${formatCount(count)} ${count === 1 ? "episode" : "episodes"}`;
}

export function formatSeasonLabel(seasonNumber: number): string {
  return seasonNumber === 0 ? "Specials" : `Season ${seasonNumber}`;
}
