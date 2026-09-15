export type SearchableCaliber = {
  id: string;
  canonicalName: string;
  aliases: { alias: string }[];
  usageCount?: number;
};

export function normalizeCaliberSearch(value: string) {
  return value.normalize("NFKC").toLocaleLowerCase("pl-PL").replace(/[×xX]/g, "x").replace(/[\s.,/()_-]/g, "");
}

export function searchCalibers<T extends SearchableCaliber>(calibers: T[], query: string) {
  const needle = normalizeCaliberSearch(query);
  if (!needle) return calibers;
  return calibers.filter((caliber) =>
    [caliber.canonicalName, ...caliber.aliases.map((item) => item.alias)]
      .some((value) => normalizeCaliberSearch(value).includes(needle)),
  );
}

export function caliberSuggestions<T extends SearchableCaliber>(calibers: T[], recentIds: string[], limit = 5) {
  const recent = recentIds.map((id) => calibers.find((item) => item.id === id)).filter((item): item is T => Boolean(item));
  const popular = [...calibers]
    .sort((a, b) => (b.usageCount ?? 0) - (a.usageCount ?? 0) || a.canonicalName.localeCompare(b.canonicalName, "pl"))
    .filter((item) => !recentIds.includes(item.id));
  return [...recent, ...popular].slice(0, limit);
}
