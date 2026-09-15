import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { WeaponInventory } from "@/components/inventory-overviews";

export const metadata = { title: "Broń w bazie" };

export default async function Page() {
  const weapons = await prisma.weapon.findMany({ include: { caliber: true, book: true, images: { orderBy: { createdAt: "asc" }, take: 1 } }, orderBy: [{ type: "asc" }, { book: { series: "asc" } }, { positionNo: "asc" }] });
  return <div className="page"><PageHeader eyebrow="Pulpit operacyjny" title="Broń w bazie" description="Pełny obraz stanu magazynu z wyszukiwaniem, filtrami i przejściem do karty każdego egzemplarza." /><WeaponInventory weapons={weapons} /></div>;
}
