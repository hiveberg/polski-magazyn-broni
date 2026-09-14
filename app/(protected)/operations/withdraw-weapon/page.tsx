import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { WithdrawWeaponForm } from "@/components/entity-forms";

export const metadata = { title: "Wycofanie broni" };
export default async function Page() {
  const [weapons, documents] = await Promise.all([prisma.weapon.findMany({ where: { status: "IN_STORAGE" }, orderBy: { registryRef: "asc" } }), prisma.document.findMany({ orderBy: { documentDate: "desc" } })]);
  return <div className="page"><PageHeader eyebrow="Operacje" title="Wycofanie, przekazanie lub zdjęcie z ewidencji" description="Broń pozostaje w bazie, a operacja tworzy trwałe zdarzenie i wpis audytu." /><section className="page-card"><WithdrawWeaponForm weapons={weapons} documents={documents} /></section></div>;
}
