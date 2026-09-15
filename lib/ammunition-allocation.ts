export type AmmoStockSource = {
  bookId: string;
  available: number;
};

export type AmmoStockAllocation = {
  bookId: string;
  quantity: number;
  availableBefore: number;
};

export type AmmoAllocationPlan = {
  allocations: AmmoStockAllocation[];
  available: number;
  complete: boolean;
};

/**
 * Preferuje jedną księgę, jeśli może samodzielnie pokryć wydanie. Dopiero gdy
 * żadna nie wystarcza, rozdziela rozchód od największego dostępnego stanu.
 * Wskazanie księgi wyłącza automatyczny dobór i ogranicza plan do niej.
 */
export function planAmmoAllocation(sources: AmmoStockSource[], quantity: number, sourceBookId?: string): AmmoAllocationPlan {
  const candidates = sources
    .filter((source) => source.available > 0 && (!sourceBookId || source.bookId === sourceBookId))
    .sort((a, b) => b.available - a.available || a.bookId.localeCompare(b.bookId));
  const available = candidates.reduce((sum, source) => sum + source.available, 0);
  if (!Number.isInteger(quantity) || quantity <= 0 || available < quantity) return { allocations: [], available, complete: false };

  const single = candidates.find((source) => source.available >= quantity);
  if (single) return { allocations: [{ bookId: single.bookId, quantity, availableBefore: single.available }], available, complete: true };

  let remaining = quantity;
  const allocations: AmmoStockAllocation[] = [];
  for (const source of candidates) {
    if (remaining === 0) break;
    const allocated = Math.min(source.available, remaining);
    allocations.push({ bookId: source.bookId, quantity: allocated, availableBefore: source.available });
    remaining -= allocated;
  }
  return { allocations, available, complete: remaining === 0 };
}
