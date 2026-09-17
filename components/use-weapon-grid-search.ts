"use client";

import { useMemo, useState, type KeyboardEvent } from "react";

export function useWeaponGridSearch<T extends { positionNo: number }>(items: T[], text: (item: T) => Array<string | null | undefined>) {
  const [query, setQueryState] = useState("");
  const [exactPosition, setExactPosition] = useState<number | null>(null);
  const filtered = useMemo(() => {
    if (exactPosition !== null) return items.filter((item) => item.positionNo === exactPosition);
    const needle = query.trim().toLocaleLowerCase("pl-PL");
    return items.filter((item) => !needle || text(item).filter(Boolean).join(" ").toLocaleLowerCase("pl-PL").includes(needle));
  }, [exactPosition, items, query, text]);

  function setQuery(value: string) { setQueryState(value); setExactPosition(null); }
  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    const value = query.trim();
    if (event.key === "Enter" && /^\d+$/.test(value)) { event.preventDefault(); setExactPosition(Number(value)); }
  }
  function clearExact() { setExactPosition(null); }
  return { query, setQuery, exactPosition, filtered, onKeyDown, clearExact };
}
