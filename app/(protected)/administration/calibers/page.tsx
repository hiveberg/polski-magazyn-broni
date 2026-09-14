import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { PageHeader } from "@/components/page-header";
import { CaliberForm } from "@/components/entity-forms";

export const metadata = { title: "Słownik kalibrów" };
export default async function Page() {
  await requireUser({ admin: true }); const calibers = await prisma.caliber.findMany({ include: { aliases: true, _count: { select: { weapons: true, ammoEntries: true } } }, orderBy: { canonicalName: "asc" } });
  return <div className="page"><PageHeader eyebrow="Administracja" title="Słownik kalibrów" description="108 współczesnych kalibrów; 92 pochodzą ze słownika armted-historical, uzupełnione o popularne pozycje i warianty zapisu." /><section className="page-card"><h2 className="section-heading">Dodaj kaliber</h2><CaliberForm /></section><section className="page-card"><div className="paper-table-wrap"><table className="paper-table"><thead><tr><th>Nazwa kanoniczna</th><th>Aliasy</th><th>Źródło</th><th>Użycia</th><th>Status</th></tr></thead><tbody>{calibers.map((caliber) => <tr key={caliber.id}><td className="registry-ref">{caliber.canonicalName}</td><td style={{ whiteSpace: "normal", maxWidth: 560 }}>{caliber.aliases.slice(0, 12).map((alias) => alias.alias).join(", ")}</td><td>{caliber.source ?? "manual"}</td><td>{caliber._count.weapons + caliber._count.ammoEntries}</td><td><span className={`badge ${caliber.active ? "ok" : "bad"}`}>{caliber.active ? "Aktywny" : "Nieaktywny"}</span></td></tr>)}</tbody></table></div></section></div>;
}
