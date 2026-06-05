/** Lowercase + strip diacritics, so "sao" matches "São". */
export function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
}

/** Relevance score by LABEL only — higher is better, 0 means no match. */
export function scoreLabel(label: string, query: string): number {
  if (!query) return 1;
  const l = normalize(label);
  const q = normalize(query);
  if (l === q) return 1000;
  if (l.startsWith(q)) return 800;
  // any word in the label starts with the query (e.g. "seg" → "Seguro Auto")
  if (l.split(/\s+/).some((w) => w.startsWith(q))) return 600;
  const idx = l.indexOf(q);
  if (idx >= 0) return 400 - Math.min(idx, 200); // earlier match ranks higher
  return 0;
}

/** Filters out non-matches and sorts the rest best-first, by label. */
export function rankByLabel<T extends { label: string }>(items: T[], query: string): T[] {
  const q = query.trim();
  if (!q) return items;
  return items
    .map((o) => ({ o, score: scoreLabel(o.label, q) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((x) => x.o);
}
