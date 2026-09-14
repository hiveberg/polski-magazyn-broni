import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { ReturnAmmoForm } from "@/components/entity-forms";

export const metadata = { title: "Zwróć amunicję" };
export default async function Page() {
  const issues = await prisma.ammoIssue.findMany({ where: { status: "ACTIVE" }, orderBy: { issuedAt: "desc" } });
  return <div className="page"><PageHeader eyebrow="Operacje" title="Zwróć amunicję" description="Zwrot zawsze dotyczy aktywnego wydania; system automatycznie oblicza rozchód." /><section className="page-card"><ReturnAmmoForm issues={issues} /></section></div>;
}
