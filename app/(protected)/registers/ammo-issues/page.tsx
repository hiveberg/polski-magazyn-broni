import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { PrintButton } from "@/components/admin-controls";
import { formatDateTime } from "@/lib/utils";

export const metadata = { title: "Książka wydawania amunicji" };
export default async function Page() {
  const books = await prisma.registerBook.findMany({ where: { type: "AMMUNITION_ISSUE" }, include: { ammoIssues: { include: { weaponIssue: { include: { weapon: true } } }, orderBy: { positionNo: "asc" } } }, orderBy: { series: "asc" } });
  return <div className="page"><PageHeader eyebrow="Rejestry zgodne z prawem" title="Ewidencja wydawania i przyjmowania amunicji" description="Zwrot odnosi się do konkretnego aktywnego wydania; rozchód jest obliczany automatycznie." actions={<PrintButton />} />{books.map((book) => <section className="page-card" key={book.id}><div className="paper-table-wrap"><table className="legal-register"><caption>Księga {book.series} — {book.name}</caption><thead><tr><th>Lp</th><th>Data i godzina wydania amunicji</th><th>Rodzaj i kaliber</th><th>Ilość wydawanej amunicji</th><th>Imię i nazwisko wydającego</th><th>Imię i nazwisko przyjmującego</th><th>Data i godzina przyjęcia amunicji</th><th>Ilość przyjmowanej amunicji</th><th>Imię i nazwisko zdającego</th><th className="no-print">Powiązana broń</th><th className="no-print">Rozchód</th></tr></thead><tbody>{book.ammoIssues.map((issue) => <tr key={issue.id}><td>{issue.positionNo}</td><td>{formatDateTime(issue.issuedAt)}</td><td>{issue.ammunitionType} / {issue.caliberSnapshot}</td><td>{issue.quantityIssued}</td><td>{issue.issuedByName}</td><td>{issue.recipientName}</td><td>{formatDateTime(issue.closedAt)}</td><td>{issue.quantityReturned}</td><td>{issue.closedByName ?? "—"}</td><td className="no-print">{issue.weaponIssue?.weapon.registryRef ?? "—"}</td><td className="no-print">{issue.quantityConsumed ?? "—"}</td></tr>)}</tbody></table></div></section>)}</div>;
}
