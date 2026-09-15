import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { AddWeaponForm } from "@/components/entity-forms";

export const metadata = { title: "Dodaj broń" };
export default async function Page() {
  const [books, calibers, documents] = await Promise.all([prisma.registerBook.findMany({ where: { type: "WEAPON", status: "ACTIVE" }, orderBy: { series: "asc" } }), prisma.caliber.findMany({ where: { active: true }, include: { aliases: true, _count: { select: { weapons: true, ammoEntries: true, ammoIssues: true } } }, orderBy: { canonicalName: "asc" } }), prisma.document.findMany({ orderBy: { documentDate: "desc" } })]);
  const caliberOptions = calibers.map((caliber) => ({ id: caliber.id, canonicalName: caliber.canonicalName, aliases: caliber.aliases, usageCount: caliber._count.weapons + caliber._count.ammoEntries + caliber._count.ammoIssues })); const documentOptions = documents.map((document) => ({ id: document.id, type: document.type, number: document.number, documentDate: document.documentDate.toISOString(), description: document.description, parties: document.parties }));
  return <div className="page"><PageHeader eyebrow="Operacje" title="Dodaj broń" description="System nada kolejną pozycję księgi i zapisze niezmienny wpis historyczny." /><section className="page-card"><AddWeaponForm books={books} calibers={caliberOptions} documents={documentOptions} /></section></div>;
}
