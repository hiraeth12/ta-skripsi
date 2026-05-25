export function dedupeByKey<T>(
  items: T[],
  getKey: (item: T) => unknown,
  limit?: number,
): T[] {
  const seen = new Set<string>();
  const result: T[] = [];

  for (const item of items) {
    const key = String(getKey(item) ?? "");
    if (!key || seen.has(key)) continue;

    seen.add(key);
    result.push(item);

    if (typeof limit === "number" && result.length >= limit) break;
  }

  return result;
}
