import Link from "next/link";
import { Archive, BookOpen, Boxes, FileText, ShieldCheck } from "lucide-react";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/page-header";

export const metadata = { title: "Wydruki" };
export default async function Page() {
  const weapons = await prisma.weapon.findMany({ orderBy: { registryRef: "asc" }, take: 200 }); const items = [["Ewidencja posiadanej broni", "/registers/weapons", Archive], ["Ewidencja posiadanej amunicji", "/registers/ammunition", Boxes], ["Ewidencja wydawania i przyjmowania broni", "/registers/weapon-issues", BookOpen], ["Ewidencja wydawania i przyjmowania amunicji", "/registers/ammo-issues", BookOpen], ["Wykaz posiadanej amunicji", "/prints/ammunition-summary", FileText], ["Raport kontroli", "/inspection", ShieldCheck]] as const;
  return <div className="page"><PageHeader eyebrow="Dokumenty / raporty" title="Wydruki" description="Każdy widok ma arkusz A4 w poziomie i może zostać zapisany do PDF z okna drukowania przeglądarki." /><div className="dashboard-grid">{items.map(([label, href, Icon]) => <Link className="page-card" href={href} key={href} style={{ textDecoration: "none", color: "inherit" }}><Icon size={28} /><h2 className="section-heading" style={{ marginTop: 12 }}>{label}</h2><span className="small muted">Otwórz podgląd rejestru →</span></Link>)}</div><section className="page-card"><h2 className="section-heading">Karta konkretnej broni</h2><div className="form-grid">{weapons.map((weapon) => <Link href={`/weapons/${weapon.id}`} key={weapon.id} className="button" style={{ justifyContent: "flex-start" }}><strong>{weapon.registryRef}</strong> {weapon.name}</Link>)}</div></section></div>;
}
