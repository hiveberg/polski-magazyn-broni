import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { PrintButton } from "@/components/admin-controls";

export const metadata = { title: "Wykaz posiadanej amunicji" };
export default async function Page() {
  const [grouped, activeAllocations] = await Promise.all([
    prisma.ammunitionRegisterEntry.groupBy({ by: ["caliberId", "ammunitionType"], _sum: { quantityIn: true, quantityOut: true } }),
    prisma.ammoIssueAllocation.findMany({ where: { issue: { status: "ACTIVE" } }, include: { issue: { select: { ammunitionType: true } } } }),
  ]);
  const reserved = new Map<string, number>();
  for (const allocation of activeAllocations) { const key = `${allocation.caliberId}:${allocation.issue.ammunitionType}`; reserved.set(key, (reserved.get(key) ?? 0) + allocation.quantity); }
  const calibers = new Map((await prisma.caliber.findMany({ where: { id: { in: grouped.map((row) => row.caliberId) } } })).map((item) => [item.id, item.canonicalName]));
  return <div className="page"><PageHeader title="Wykaz posiadanej amunicji" description="Stan ewidencyjny pomniejszony o blokady wskazuje ilość dostępną do wydania." actions={<PrintButton />} /><section className="page-card"><div className="paper-table-wrap"><table className="legal-register" style={{ minWidth: 800 }}><caption>Wykaz posiadanej amunicji</caption><thead><tr><th>Lp</th><th>Kaliber i typ amunicji</th><th>Stan ewidencyjny</th><th>Zablokowane</th><th>Dostępne</th></tr></thead><tbody>{grouped.map((row, index) => { const ledger = (row._sum.quantityIn ?? 0) - (row._sum.quantityOut ?? 0); const held = reserved.get(`${row.caliberId}:${row.ammunitionType}`) ?? 0; return <tr key={`${row.caliberId}-${row.ammunitionType}`}><td>{index + 1}</td><td>{calibers.get(row.caliberId)} / {row.ammunitionType}</td><td>{ledger} szt.</td><td>{held} szt.</td><td>{ledger - held} szt.</td></tr>; })}</tbody></table></div></section></div>;
}
