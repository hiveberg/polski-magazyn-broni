import { AmmoCorrectionForm, type CorrectionBook } from "@/components/ammo-correction-control";
import { PageHeader } from "@/components/page-header";
import { ammoStockKey, getAmmoStockBalances } from "@/lib/ammunition-stock";
import { prisma } from "@/lib/db";
import { formatDateTime } from "@/lib/utils";

export const metadata = { title: "Korekty" };

export default async function Page() {
  const books = await prisma.registerBook.findMany({
    where: { type: "AMMUNITION" },
    include: { ammoEntries: { include: { caliber: true }, orderBy: { positionNo: "asc" } } },
    orderBy: { series: "asc" },
  });
  const balances = await getAmmoStockBalances(prisma, { bookIds: books.map((book) => book.id) });
  const correctionBooks: CorrectionBook[] = books.map((book) => ({
    id: book.id,
    series: book.series,
    name: book.name,
    entries: book.ammoEntries.map((entry) => ({
      id: entry.id,
      registryRef: entry.registryRef,
      caliber: entry.caliber.canonicalName,
      ammunitionType: entry.ammunitionType,
      basis: entry.basis,
      kind: entry.kind,
      quantityIn: entry.quantityIn,
      quantityOut: entry.quantityOut,
      balanceAfter: entry.balanceAfter,
      effectiveAt: formatDateTime(entry.effectiveAt),
      available: balances.get(ammoStockKey(book.id, entry.caliberId))?.available ?? 0,
    })),
  }));

  return <div className="page"><PageHeader eyebrow="Dokumenty / raporty" title="Korekty" description="Wybierz rejestr i konkretną pozycję ewidencji amunicji. Korekta utworzy nowy wpis, bez zmiany wpisu źródłowego." /><AmmoCorrectionForm books={correctionBooks} /></div>;
}
