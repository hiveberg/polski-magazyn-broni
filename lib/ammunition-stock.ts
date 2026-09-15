import type { Prisma, PrismaClient } from "@prisma/client";

type AmmoStockDatabase = Pick<PrismaClient, "ammunitionRegisterEntry" | "ammoIssueAllocation"> | Pick<Prisma.TransactionClient, "ammunitionRegisterEntry" | "ammoIssueAllocation">;

export type AmmoStockBalance = {
  bookId: string;
  caliberId: string;
  ledger: number;
  reserved: number;
  available: number;
};

export const ammoStockKey = (bookId: string, caliberId: string) => `${bookId}:${caliberId}`;

export async function getAmmoStockBalances(db: AmmoStockDatabase, options: { bookIds?: string[]; caliberId?: string } = {}) {
  const bookFilter = options.bookIds?.length ? { in: options.bookIds } : undefined;
  const [ledgerRows, reservationRows] = await Promise.all([
    db.ammunitionRegisterEntry.groupBy({
      by: ["bookId", "caliberId"],
      where: { ...(bookFilter ? { bookId: bookFilter } : {}), ...(options.caliberId ? { caliberId: options.caliberId } : {}) },
      _sum: { quantityIn: true, quantityOut: true },
    }),
    db.ammoIssueAllocation.groupBy({
      by: ["bookId", "caliberId"],
      where: { issue: { status: "ACTIVE" }, ...(bookFilter ? { bookId: bookFilter } : {}), ...(options.caliberId ? { caliberId: options.caliberId } : {}) },
      _sum: { quantity: true },
    }),
  ]);

  const balances = new Map<string, AmmoStockBalance>();
  for (const row of ledgerRows) {
    const ledger = (row._sum.quantityIn ?? 0) - (row._sum.quantityOut ?? 0);
    balances.set(ammoStockKey(row.bookId, row.caliberId), { bookId: row.bookId, caliberId: row.caliberId, ledger, reserved: 0, available: ledger });
  }
  for (const row of reservationRows) {
    const key = ammoStockKey(row.bookId, row.caliberId);
    const current = balances.get(key) ?? { bookId: row.bookId, caliberId: row.caliberId, ledger: 0, reserved: 0, available: 0 };
    const reserved = row._sum.quantity ?? 0;
    balances.set(key, { ...current, reserved, available: current.ledger - reserved });
  }
  return balances;
}

export function sumAmmoStock(balances: Iterable<Pick<AmmoStockBalance, "ledger" | "reserved" | "available">>) {
  let ledger = 0;
  let reserved = 0;
  for (const balance of balances) {
    ledger += balance.ledger;
    reserved += balance.reserved;
  }
  return { ledger, reserved, available: ledger - reserved };
}
