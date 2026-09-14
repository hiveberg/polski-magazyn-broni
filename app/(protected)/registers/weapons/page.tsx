import Link from "next/link";
import { prisma } from "@/lib/db";
import { formatDate } from "@/lib/utils";
import { PageHeader } from "@/components/page-header";
import { PrintButton } from "@/components/admin-controls";

export const metadata = { title: "Ewidencja broni" };
export default async function Page() {
  const books = await prisma.registerBook.findMany({ where: { type: "WEAPON" }, include: { weapons: { include: { caliber: true, acquisitionDocument: true }, orderBy: { positionNo: "asc" } } }, orderBy: { series: "asc" } });
  return <div className="page"><PageHeader eyebrow="Rejestry zgodne z prawem" title="Ewidencja posiadanej broni" description="Układ pól odpowiada papierowej ewidencji. Zwykłe listy używają jednej referencji, np. A12." actions={<PrintButton />} />{books.map((book) => <section className="page-card" key={book.id}><div className="paper-table-wrap"><table className="legal-register"><caption>Księga {book.series} — {book.name}</caption><thead><tr><th>Lp</th><th>Nazwa i marka broni</th><th>Kaliber broni i rok produkcji</th><th>Seria i numer broni</th><th>Inne cechy identyfikacyjne, w tym wyposażenie dodatkowe</th><th>Podstawa nabycia lub przejęcia</th><th>Data zewidencjonowania</th><th>Podstawa i data przekazania</th><th>Podstawa i data zdjęcia z ewidencji</th><th className="no-print">Szczegóły</th></tr></thead><tbody>{book.weapons.map((weapon) => <tr key={weapon.id}><td>{weapon.positionNo}</td><td>{weapon.name} / {weapon.brand}</td><td>{weapon.caliber.canonicalName}{weapon.productionYear ? ` / ${weapon.productionYear}` : ""}</td><td>{weapon.weaponSeries ? `${weapon.weaponSeries} / ` : ""}{weapon.serialNumber}</td><td>{[weapon.otherIdentifyingMarks, weapon.accessories].filter(Boolean).join("; ") || "—"}</td><td>{weapon.acquisitionBasis}</td><td>{formatDate(weapon.registeredAt)}</td><td>{weapon.status === "TRANSFERRED" ? "Zob. historię" : "—"}</td><td>{["WITHDRAWN", "DEREGISTERED"].includes(weapon.status) ? "Zob. historię" : "—"}</td><td className="no-print"><Link href={`/weapons/${weapon.id}`}>{weapon.registryRef}</Link></td></tr>)}</tbody></table></div></section>)}</div>;
}
