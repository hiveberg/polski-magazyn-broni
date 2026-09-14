import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { AddWeaponForm } from "@/components/entity-forms";

export const metadata = { title: "Dodaj broń" };
export default async function Page() {
  const [books, calibers, documents] = await Promise.all([prisma.registerBook.findMany({ where: { type: "WEAPON", status: "ACTIVE" }, orderBy: { series: "asc" } }), prisma.caliber.findMany({ where: { active: true }, orderBy: { canonicalName: "asc" } }), prisma.document.findMany({ orderBy: { documentDate: "desc" } })]);
  return <div className="page"><PageHeader eyebrow="Operacje" title="Dodaj broń" description="System nada kolejną pozycję księgi i zapisze niezmienny wpis historyczny." /><section className="page-card"><AddWeaponForm books={books} calibers={calibers} documents={documents} /></section></div>;
}
