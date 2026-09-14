import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { PrintButton } from "@/components/admin-controls";

export const metadata = { title: "Wykaz posiadanej amunicji" };
export default async function Page() {
  const grouped = await prisma.ammunitionRegisterEntry.groupBy({ by: ["caliberId", "ammunitionType"], _sum: { quantityIn: true, quantityOut: true } }); const calibers = new Map((await prisma.caliber.findMany({ where: { id: { in: grouped.map((row) => row.caliberId) } } })).map((item) => [item.id, item.canonicalName]));
  return <div className="page"><PageHeader title="Wykaz posiadanej amunicji" description="Zestawienie obliczone z ledgeru wszystkich ksiąg." actions={<PrintButton />} /><section className="page-card"><div className="paper-table-wrap"><table className="legal-register" style={{ minWidth: 700 }}><caption>Wykaz posiadanej amunicji</caption><thead><tr><th>Lp</th><th>Kaliber i typ amunicji</th><th>Stan</th></tr></thead><tbody>{grouped.map((row, index) => <tr key={`${row.caliberId}-${row.ammunitionType}`}><td>{index + 1}</td><td>{calibers.get(row.caliberId)} / {row.ammunitionType}</td><td>{(row._sum.quantityIn ?? 0) - (row._sum.quantityOut ?? 0)} szt.</td></tr>)}</tbody></table></div></section></div>;
}
