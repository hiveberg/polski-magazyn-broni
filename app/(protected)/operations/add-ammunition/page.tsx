import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { AddAmmoForm } from "@/components/entity-forms";

export const metadata = { title: "Dodaj amunicję" };
export default async function Page() {
  const [books, calibers, documents] = await Promise.all([prisma.registerBook.findMany({ where: { type: "AMMUNITION", status: "ACTIVE" }, orderBy: { series: "asc" } }), prisma.caliber.findMany({ where: { active: true }, include: { aliases: true, _count: { select: { weapons: true, ammoEntries: true, ammoIssues: true } } }, orderBy: { canonicalName: "asc" } }), prisma.document.findMany({ orderBy: { documentDate: "desc" } })]);
  const caliberOptions = calibers.map((caliber) => ({ id: caliber.id, canonicalName: caliber.canonicalName, aliases: caliber.aliases, usageCount: caliber._count.weapons + caliber._count.ammoEntries + caliber._count.ammoIssues })); const documentOptions = documents.map((document) => ({ id: document.id, type: document.type, number: document.number, documentDate: document.documentDate.toISOString(), description: document.description, parties: document.parties }));
  return <div className="page"><PageHeader eyebrow="Operacje" title="Dodaj amunicję" description="Przychód trafi do ledgeru i otrzyma referencję księgi." /><section className="page-card"><AddAmmoForm books={books} calibers={caliberOptions} documents={documentOptions} /></section></div>;
}
