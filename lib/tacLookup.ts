/**
 * Model-matching helpers for IMEI lookup results (from IMEIDB.xyz or similar).
 * No local TAC database; IMEI lookup is done via API (lib/imeidb.ts).
 */

export type TacEntry = {
  brand: string;
  model: string;
};

/**
 * Normalize for comparison so API names like "iPhone 15 (Standard)", "iPhone 15, 128GB"
 * match user input "iPhone 15". Lowercase, collapse spaces, strip brand prefix,
 * parentheticals, and capacity/size suffixes.
 */
function normalizeModel(s: string): string {
  return s
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^(apple|samsung|google|oneplus)\s+/i, '')
    .replace(/\s*\([^)]*\)\s*/g, ' ') // "iPhone 15 (Standard)" -> "iPhone 15"
    .replace(/\s*[,\-–—]\s*\d+\s*(gb|tb|mb)\s*$/i, '') // "iPhone 15, 128GB" -> "iPhone 15"
    .replace(/\s+\d+\s*(gb|tb|mb)\s*$/i, '')
    .replace(/\s*\d+\.?\d*\s*[""]?\s*(inch|in\.?|")\s*/gi, ' ') // "6.1-inch" / "6.1\""
    .replace(/\s+/g, ' ')
    .trim();
}

/** Extract leading model number(s) for stricter match (e.g. "14", "16" from "iphone 14" / "iphone 16 pro"). */
function extractModelNumbers(s: string): string[] {
  const matches = s.match(/\d+/g);
  return matches ? [...matches] : [];
}

/**
 * Check if the lookup result "matches" the user-entered model (e.g. "iPhone 16 Pro").
 * Returns true if they match (normalized), false if clearly different, 'unknown' if no entry.
 */
export function modelMatches(entry: TacEntry | null, userModel: string): boolean | 'unknown' {
  if (!entry || (!entry.model && !entry.brand)) return 'unknown';
  const userNorm = normalizeModel(userModel);
  if (!userNorm) return 'unknown';
  const combined = normalizeModel(`${entry.brand} ${entry.model}`);
  if (!combined) return 'unknown';
  // If both have model numbers (e.g. 14 vs 16), they must match
  const userNums = extractModelNumbers(userNorm);
  const entryNums = extractModelNumbers(combined);
  if (userNums.length > 0 && entryNums.length > 0) {
    const userMain = userNums[0];
    const entryMain = entryNums[0];
    if (userMain !== entryMain) return false;
  }
  // Same or one contains the other (e.g. "iphone 16 pro" vs "apple iphone 16 pro")
  if (combined === userNorm) return true;
  if (combined.includes(userNorm) || userNorm.includes(combined)) return true;
  const entryModelNorm = normalizeModel(entry.model);
  if (entryModelNorm && (entryModelNorm.includes(userNorm) || userNorm.includes(entryModelNorm))) return true;
  return false;
}
