// ─── Filter constants tied to what's actually in the DB ───────────────────
// See queries in /Users/yazeed/Desktop/DB/supabase/migrations/... and live
// distribution as of seed. Arabic is excluded — 0 movies, no fake chips.

export const LANGUAGES = [
  { code: "",   label: "All" },
  { code: "en", label: "English" },
  { code: "ar", label: "Arabic" },
  { code: "ja", label: "Japanese" },
  { code: "fr", label: "French" },
  { code: "ko", label: "Korean" },
  { code: "es", label: "Spanish" },
  { code: "zh", label: "Chinese" },
  { code: "it", label: "Italian" },
] as const;

export const RATINGS = [
  { code: "",       label: "All Ratings" },
  { code: "G",      label: "G — General Audiences" },
  { code: "PG",     label: "PG — Parental Guidance" },
  { code: "PG-13",  label: "PG-13 — Under 13 Cautioned" },
  { code: "R",      label: "R — Restricted" },
  { code: "NC-17",  label: "NC-17 — Adults Only" },
  { code: "NR",     label: "Not Rated" },
] as const;

/**
 * Build a querystring that preserves the current filters but updates a single
 * key. Passing "" clears that key. Useful for chip links that stack.
 */
export function buildFilterHref(
  current: URLSearchParams,
  key: string,
  value: string,
  basePath = "/browse"
): string {
  const next = new URLSearchParams(current);
  if (value === "" || !value) next.delete(key);
  else next.set(key, value);
  const q = next.toString();
  return q ? `${basePath}?${q}` : basePath;
}

export function hasAnyFilter(sp: URLSearchParams): boolean {
  for (const k of ["lang", "rating", "year", "q"]) if (sp.has(k)) return true;
  return false;
}
