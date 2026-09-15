import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { AmmunitionOverview } from "@/components/inventory-overviews";
import { getAmmoStockBalances } from "@/lib/ammunition-stock";

export const metadata = { title: "Stan amunicji" };

export default async function Page() {
  const [rows, calibers, books] = await Promise.all([
    getAmmoStockBalances(prisma),
    prisma.caliber.findMany({ select: { id: true, canonicalName: true } }),
    prisma.registerBook.findMany({ where: { type: "AMMUNITION" }, select: { id: true, series: true, name: true }, orderBy: { series: "asc" } }),
  ]);
  const caliberNames = new Map(calibers.map((item) => [item.id, item.canonicalName])); const bookMap = new Map(books.map((item) => [item.id, item]));
  const emptyTotals = () => ({ ledger: 0, reserved: 0, available: 0 });
  const byCaliberMap = new Map<string, { id: string; name: string; ledger: number; reserved: number; available: number; books: { id: string; series: string; name: string; ledger: number; reserved: number; available: number }[] }>();
  const byBookMap = new Map(books.map((book) => [book.id, { ...book, ...emptyTotals(), calibers: [] as { id: string; name: string; ledger: number; reserved: number; available: number }[] }]));
  for (const row of rows.values()) { const book = bookMap.get(row.bookId); const name = caliberNames.get(row.caliberId); if (!book || !name) continue; const caliber = byCaliberMap.get(row.caliberId) ?? { id: row.caliberId, name, ...emptyTotals(), books: [] }; caliber.ledger += row.ledger; caliber.reserved += row.reserved; caliber.available += row.available; caliber.books.push({ ...book, ledger: row.ledger, reserved: row.reserved, available: row.available }); byCaliberMap.set(row.caliberId, caliber); const bookStock = byBookMap.get(row.bookId)!; bookStock.ledger += row.ledger; bookStock.reserved += row.reserved; bookStock.available += row.available; bookStock.calibers.push({ id: row.caliberId, name, ledger: row.ledger, reserved: row.reserved, available: row.available }); }
  const byCaliber = [...byCaliberMap.values()].sort((a, b) => a.name.localeCompare(b.name, "pl")); const byBook = [...byBookMap.values()];
  return <div className="page"><PageHeader eyebrow="Pulpit operacyjny" title="Stan amunicji" description="Stan ewidencyjny, aktywne blokady i ilość dostępna do kolejnych wydań." /><AmmunitionOverview byCaliber={byCaliber} byBook={byBook} /></div>;
}
