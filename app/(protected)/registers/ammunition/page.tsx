import Link from "next/link";
import { Suspense } from "react";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { PrintButton } from "@/components/admin-controls";
import { formatDateTime } from "@/lib/utils";
import { RegisterBookPicker } from "@/components/pickers";
import { EmptyState } from "@/components/ui-system";
import { documentTypeLabels, labelFor } from "@/lib/labels";

export const metadata = { title: "Ewidencja amunicji" };

export default async function Page({ searchParams }: { searchParams: Promise<{ book?: string }> }) {
  const requested = (await searchParams).book; const books = await prisma.registerBook.findMany({ where: { type: "AMMUNITION" }, orderBy: { series: "asc" } });
  if (!books.length) return <div className="page"><PageHeader eyebrow="Rejestry zgodne z prawem" title="Ewidencja posiadanej amunicji" description="Stan jest odtwarzalny z ledgeru." /><section className="page-card"><EmptyState title="Brak księgi amunicji" description="Administrator musi najpierw utworzyć księgę ewidencji amunicji." /></section></div>;
  const selected = books.find((book) => book.id === requested) ?? books[0];
  const entries = await prisma.ammunitionRegisterEntry.findMany({ where: { bookId: selected.id }, include: { caliber: true, document: true, corrections: true }, orderBy: { positionNo: "asc" } });
  return <div className="page"><PageHeader eyebrow="Rejestry zgodne z prawem" title="Ewidencja posiadanej amunicji" description="W danym momencie widoczna jest jedna wybrana księga." actions={<PrintButton />} /><section className="book-selector-card no-print"><Suspense><RegisterBookPicker books={books} selectedId={selected.id} storageKey="pmb:ammo-register-book" /></Suspense></section><section className="page-card"><div className="paper-table-wrap"><table className="legal-register"><caption>Księga {selected.series} — {selected.name}</caption><thead><tr><th>Lp</th><th>Kaliber i typ amunicji</th><th>Podstawa nabycia lub przejęcia z innej jednostki</th><th>Przychód</th><th>Rozchód</th><th>Stan amunicji</th><th>Data i godzina</th><th className="no-print">Korekty</th></tr></thead><tbody>{entries.map((entry) => <tr key={entry.id}><td>{entry.positionNo}</td><td>{entry.caliber.canonicalName} / {entry.ammunitionType}</td><td>{entry.basis}{entry.document && <Link className="document-link compact-link" href={`/documents/${entry.document.id}`}>{labelFor(documentTypeLabels, entry.document.type, "Inny dokument")} {entry.document.number || entry.document.description}</Link>}</td><td>{entry.quantityIn || "—"}</td><td>{entry.quantityOut || "—"}</td><td>{entry.balanceAfter}</td><td>{formatDateTime(entry.effectiveAt)}</td><td className="no-print">{entry.corrections.length || "—"}</td></tr>)}{!entries.length && <tr><td colSpan={8} className="muted">Ta księga nie zawiera jeszcze wpisów.</td></tr>}</tbody></table></div></section></div>;
}
