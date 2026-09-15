import Link from "next/link";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { PrintButton } from "@/components/admin-controls";
import { formatDateTime } from "@/lib/utils";

export const metadata = { title: "Książka wydawania amunicji" };

const statusPresentation = {
  ACTIVE: { label: "Nierozliczone", tone: "warn" },
  CLOSED: { label: "Rozliczone", tone: "ok" },
  CANCELLED_BY_CORRECTION: { label: "Anulowane korektą", tone: "bad" },
} as const;

export default async function Page() {
  const books = await prisma.registerBook.findMany({
    where: { type: "AMMUNITION_ISSUE" },
    include: {
      ammoIssues: {
        include: {
          sourceBook: true,
          weaponIssue: { include: { weapon: true } },
          allocations: { include: { book: true }, orderBy: { sequence: "asc" } },
        },
        orderBy: { positionNo: "asc" },
      },
    },
    orderBy: { series: "asc" },
  });
  return <div className="page"><PageHeader eyebrow="Rejestry zgodne z prawem" title="Ewidencja wydawania i przyjmowania amunicji" description="Nierozliczone wydanie blokuje amunicję. Rozchód trafia do ewidencji dopiero podczas rozliczenia." actions={<PrintButton />} />{books.map((book) => <section className="page-card" key={book.id}><div className="paper-table-wrap"><table className="legal-register"><caption>Księga {book.series} — {book.name}</caption><thead><tr><th>Lp</th><th>Data i godzina wydania amunicji</th><th>Rodzaj i kaliber</th><th>Ilość wydawanej amunicji</th><th>Księga / księgi źródłowe</th><th>Imię i nazwisko wydającego</th><th>Imię i nazwisko przyjmującego</th><th>Data i godzina przyjęcia amunicji</th><th>Ilość przyjmowanej amunicji</th><th>Imię i nazwisko zdającego</th><th className="no-print">Powiązana broń</th><th>Rozchód</th><th>Status</th></tr></thead><tbody>{book.ammoIssues.map((issue) => { const status = statusPresentation[issue.status]; const sources = issue.allocations.length ? issue.allocations.map((allocation) => `${allocation.book.series} — ${allocation.book.name}: ${allocation.quantity.toLocaleString("pl-PL")} szt.`).join("; ") : `${issue.sourceBook.series} — ${issue.sourceBook.name}`; return <tr key={issue.id}><td>{issue.positionNo}</td><td>{formatDateTime(issue.issuedAt)}</td><td>{issue.ammunitionType} / {issue.caliberSnapshot}</td><td>{issue.quantityIssued}</td><td>{sources}</td><td>{issue.issuedByName}</td><td>{issue.recipientName}</td><td>{formatDateTime(issue.closedAt)}</td><td>{issue.status === "CLOSED" ? issue.quantityReturned : "—"}</td><td>{issue.closedAt ? issue.recipientName : "—"}</td><td className="no-print">{issue.weaponIssue?.weapon.id ? <Link className="registry-link" href={`/weapons/${issue.weaponIssue.weapon.id}`}>{issue.weaponIssue.weapon.registryRef}</Link> : "—"}</td><td>{issue.quantityConsumed ?? "—"}</td><td><span className={`badge ${status.tone}`}>{status.label}</span></td></tr>; })}</tbody></table></div></section>)}</div>;
}
