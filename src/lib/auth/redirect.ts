/**
 * Where to go after logging in. Only same-site paths are allowed so `?next=` can't send someone to
 * another site; "//host", backslashes and control characters (which browsers strip) are rejected.
 */
export function safeNextPath(value: unknown): string | null {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//")) return null;
  return /[\\\u0000-\u001f\u007f]/.test(value) ? null : value;
}
