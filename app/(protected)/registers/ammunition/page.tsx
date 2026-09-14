import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { PrintButton } from "@/components/admin-controls";
import { formatDateTime } from "@/lib/utils";

export const metadata = { title: "Ewidencja amunicji" };
export default async function Page() {
  const books = await prisma.registerBook.findMany({ where: { type: "AMMUNITION" }, include: { ammoEntries: { include: { caliber: true, document: true, corrections: true }, orderBy: { positionNo: "asc" } } }, orderBy: { series: "asc" } });
  return <div className="page"><PageHeader eyebrow="Rejestry zgodne z prawem" title="Ewidencja posiadanej amunicji" description="Stan każdego wiersza jest odtwarzalny z przychodów i rozchodów ledgeru." actions={<PrintButton />} />{books.map((book) => <section className="page-card" key={book.id}><div className="paper-table-wrap"><table className="legal-register"><caption>Księga {book.series} — {book.name}</caption><thead><tr><th>Lp</th><th>Kaliber i typ amunicji</th><th>Podstawa nabycia lub przejęcia z innej jednostki</th><th>Przychód</th><th>Rozchód</th><th>Stan amunicji</th><th>Data i godzina</th><th className="no-print">Korekty</th></tr></thead><tbody>{book.ammoEntries.map((entry) => <tr key={entry.id}><td>{entry.positionNo}</td><td>{entry.caliber.canonicalName} / {entry.ammunitionType}</td><td>{entry.basis}</td><td>{entry.quantityIn || "—"}</td><td>{entry.quantityOut || "—"}</td><td>{entry.balanceAfter}</td><td>{formatDateTime(entry.effectiveAt)}</td><td className="no-print">{entry.corrections.length || "—"}</td></tr>)}</tbody></table></div></section>)}</div>;
}
