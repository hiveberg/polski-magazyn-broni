import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { IssueAmmoForm } from "@/components/entity-forms";

export const metadata = { title: "Wydaj amunicję" };
export default async function Page() {
  const [ammoBooks, issueBooks, calibers, activeIssues] = await Promise.all([prisma.registerBook.findMany({ where: { type: "AMMUNITION", status: "ACTIVE" }, orderBy: { series: "asc" } }), prisma.registerBook.findMany({ where: { type: "AMMUNITION_ISSUE", status: "ACTIVE" }, orderBy: { series: "asc" } }), prisma.caliber.findMany({ where: { active: true }, orderBy: { canonicalName: "asc" } }), prisma.ammoIssue.findMany({ where: { status: "ACTIVE" }, orderBy: { issuedAt: "desc" } })]);
  return <div className="page"><PageHeader eyebrow="Operacje" title="Wydaj amunicję" description="Niezależne wydanie albo kontynuacja istniejącego wydania tego samego kalibru." /><section className="page-card"><IssueAmmoForm ammoBooks={ammoBooks} issueBooks={issueBooks} calibers={calibers} activeIssues={activeIssues} /></section></div>;
}
