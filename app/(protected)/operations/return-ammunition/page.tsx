import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { ReturnAmmoForm } from "@/components/entity-forms";

export const metadata = { title: "Zwróć amunicję" };
export default async function Page() {
  const records = await prisma.ammoIssue.findMany({ where: { status: "ACTIVE" }, include: { allocations: { include: { book: { select: { series: true, name: true } } }, orderBy: { sequence: "asc" } }, weaponIssue: { include: { weapon: { select: { id: true, registryRef: true } } } } }, orderBy: [{ issuedAt: "asc" }, { positionNo: "asc" }] });
  const issues = records.map((issue) => ({ id: issue.id, registryRef: issue.registryRef, recipientName: issue.recipientName, recipientReference: issue.recipientReference, quantityIssued: issue.quantityIssued, caliberSnapshot: issue.caliberSnapshot, caliberId: issue.caliberId, ammunitionType: issue.ammunitionType, issuedAt: issue.issuedAt.toISOString(), allocations: issue.allocations, weapon: issue.weaponIssue?.weapon ?? null }));
  return <div className="page"><PageHeader eyebrow="Operacje" title="Zwróć amunicję" description="Wybierz nierozliczone wydanie. Rozchód trafi do ewidencji dopiero po rozliczeniu, a zwrócona część zwolni blokadę." /><section className="page-card"><ReturnAmmoForm issues={issues} /></section></div>;
}
