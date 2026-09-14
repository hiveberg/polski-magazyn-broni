import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { AddAmmoForm } from "@/components/entity-forms";

export const metadata = { title: "Dodaj amunicję" };
export default async function Page() {
  const [books, calibers, documents] = await Promise.all([prisma.registerBook.findMany({ where: { type: "AMMUNITION", status: "ACTIVE" }, orderBy: { series: "asc" } }), prisma.caliber.findMany({ where: { active: true }, orderBy: { canonicalName: "asc" } }), prisma.document.findMany({ orderBy: { documentDate: "desc" } })]);
  return <div className="page"><PageHeader eyebrow="Operacje" title="Dodaj amunicję" description="Przychód trafi do ledgeru i otrzyma referencję księgi." /><section className="page-card"><AddAmmoForm books={books} calibers={calibers} documents={documents} /></section></div>;
}
