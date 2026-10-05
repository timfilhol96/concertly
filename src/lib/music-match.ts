// Fuzzy-matching helpers shared by the setlist.fm and Spotify lookups. The two
// services often spell the same artist or song differently ("The 1975" vs
// "1975", "Beyoncé" vs "Beyonce", "Don’t" vs "Don't", "Song - 2011 Remaster"),
// so we compare normalized keys instead of raw strings.

/** Lowercase, strip accents/punctuation, unify "&"/"and", drop a leading "the". */
export function nameKey(s: string): string {
  return s
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[‘’`´]/g, "'")
    .replace(/&|\+/g, " and ")
    .replace(/'/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .replace(/^the /, "")
    .replace(/\s+/g, "");
}

const VERSION_WORDS =
  /\b(remaster(ed)?|live|version|mono|stereo|edit|mix|remix|demo|acoustic|feat\.?|ft\.?|with|from|single|deluxe|bonus|re-?recorded|session|instrumental|explicit|clean)\b/i;

/** Drop " - 2011 Remaster", "(Live at …)", "[feat. X]" style decorations. */
export function stripDecorations(title: string): string {
  let t = title;
  // " - Live", " - 2011 Remaster" (only when the suffix looks like a version tag)
  t = t.replace(/\s+[-–—]\s+([^-–—]+)$/, (m, tail: string) => (VERSION_WORDS.test(tail) ? "" : m));
  // "(Live)", "[feat. X]" etc. Plain parentheticals such as "(Nothing Else)" stay.
  t = t.replace(/\s*[([]([^)\]]*)[)\]]/g, (m, inner: string) =>
    VERSION_WORDS.test(inner) ? "" : m,
  );
  return t.trim() || title.trim();
}

export function titleKey(title: string): string {
  return nameKey(stripDecorations(title));
}

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return prev[b.length];
}

/** 0..1 similarity of two already-normalized keys. */
export function similarity(a: string, b: string): number {
  const len = Math.max(a.length, b.length);
  if (len === 0) return 1;
  return 1 - levenshtein(a, b) / len;
}

/** True when two artist names very likely refer to the same act. */
export function sameArtist(a: string, b: string): boolean {
  const ka = nameKey(a);
  const kb = nameKey(b);
  if (!ka || !kb) return false;
  return ka === kb || similarity(ka, kb) >= 0.85;
}

// Spelling variants that show up in venue names across setlist.fm, ticketing
// sites and manual entry.
const VENUE_SYNONYMS: Array<[RegExp, string]> = [
  [/\btheater\b/g, "theatre"],
  [/\bcenter\b/g, "centre"],
  [/\bamphitheater\b/g, "amphitheatre"],
  [/\bst\b\.?/g, "saint"],
  [/\bmt\b\.?/g, "mount"],
  [/\bsq\b\.?/g, "square"],
];

/** Key for venues and cities: nameKey plus British/US spelling unification. */
export function placeKey(s: string): string {
  let t = s
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
  for (const [re, to] of VENUE_SYNONYMS) t = t.replace(re, to);
  return nameKey(t);
}

/** True when two venue (or city) names are very likely the same place. */
export function samePlace(a: string, b: string): boolean {
  const ka = placeKey(a);
  const kb = placeKey(b);
  if (!ka || !kb) return false;
  if (ka === kb) return true;
  // "Stage 1" vs "Stage 2", "O2 Academy 1" vs "O2 Academy 2" are different rooms.
  if (ka.replace(/\D/g, "") !== kb.replace(/\D/g, "")) return false;
  // Short names ("Ritz", "Roxy") must match exactly; one typo would be too loose.
  return Math.min(ka.length, kb.length) >= 6 && similarity(ka, kb) >= 0.88;
}

/**
 * Groups spelling variants of the same name. Returns a lookup from each raw
 * value to its group's display name: the most common spelling, ties going to
 * the one seen first (callers pass newest-first lists, so the latest spelling).
 */
export function clusterNames(
  values: string[],
  same: (a: string, b: string) => boolean,
): Map<string, string> {
  const counts = new Map<string, number>();
  for (const v of values) if (v) counts.set(v, (counts.get(v) ?? 0) + 1);
  // Map preserves insertion order, so a stable sort keeps first-seen ties first.
  const distinct = [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([v]) => v);
  const display = new Map<string, string>();
  const heads: string[] = [];
  for (const v of distinct) {
    const head = heads.find((h) => same(h, v));
    if (head) display.set(v, head);
    else {
      heads.push(v);
      display.set(v, v);
    }
  }
  return display;
}
