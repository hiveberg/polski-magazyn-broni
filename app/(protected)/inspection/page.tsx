import Link from "next/link";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { PrintButton } from "@/components/admin-controls";
import { InlineAlert } from "@/components/ui-system";
import { formatDateTime } from "@/lib/utils";
import { auditEntityTypeLabels, auditOperationLabels, labelFor } from "@/lib/labels";
import { getAmmoStockBalances, sumAmmoStock } from "@/lib/ammunition-stock";

export const metadata = { title: "Raport kontroli" };

export default async function Page() {
  const [total, storage, issued, inactive, users, operations, activeWeaponIssues, activeAmmoIssues, flags, ammoBalances] = await Promise.all([
    prisma.weapon.count(),
    prisma.weapon.count({ where: { status: "IN_STORAGE" } }),
    prisma.weapon.count({ where: { status: "ISSUED" } }),
    prisma.weapon.count({ where: { status: { in: ["WITHDRAWN", "TRANSFERRED", "DEREGISTERED"] } } }),
    prisma.user.count({ where: { active: true, isBootstrap: false } }),
    prisma.auditEvent.findMany({ orderBy: { sequence: "desc" }, take: 10 }),
    prisma.weaponIssue.count({ where: { status: "ACTIVE" } }),
    prisma.ammoIssue.count({ where: { status: "ACTIVE" } }),
    prisma.physicalVerificationFlag.findMany({ where: { resolvedAt: null }, include: { weapon: true }, orderBy: { createdAt: "desc" } }),
    getAmmoStockBalances(prisma),
  ]);
  const ammo = sumAmmoStock(ammoBalances.values());

  return (
    <div className="page">
      <PageHeader eyebrow="Dokumenty / raporty" title="Raport kontroli magazynu" description={`Wygenerowano ${formatDateTime(new Date())}`} actions={<PrintButton />} />
      <div className="kpis">
        <div className="kpi"><div><span>Broń ogółem</span><strong>{total}</strong></div></div>
        <div className="kpi"><div><span>W magazynie</span><strong>{storage}</strong></div></div>
        <div className="kpi"><div><span>Wydana</span><strong>{issued}</strong></div></div>
        <div className="kpi"><div><span>Wycofana / przekazana</span><strong>{inactive}</strong></div></div>
        <div className="kpi"><div><span>Amunicja ewidencyjna</span><strong>{ammo.ledger.toLocaleString("pl-PL")}</strong></div></div>
        <div className="kpi"><div><span>Amunicja zablokowana</span><strong>{ammo.reserved.toLocaleString("pl-PL")}</strong></div></div>
        <div className="kpi"><div><span>Amunicja dostępna</span><strong>{ammo.available.toLocaleString("pl-PL")}</strong></div></div>
      </div>
      <div className="dashboard-grid">
        <section className="page-card">
          <h2 className="section-heading">Stan operacyjny</h2>
          <dl className="detail-list">
            <div className="detail-row"><dt>Aktywni użytkownicy</dt><dd>{users}</dd></div>
            <div className="detail-row"><dt>Aktywne wydania broni</dt><dd>{activeWeaponIssues}</dd></div>
            <div className="detail-row"><dt>Aktywne wydania amunicji</dt><dd>{activeAmmoIssues}</dd></div>
            <div className="detail-row"><dt>Pozycje do sprawdzenia fizycznego</dt><dd className={flags.length ? "red" : "green"}>{flags.length}</dd></div>
          </dl>
        </section>
        <section className="page-card">
          <h2 className="section-heading">Wymagają fizycznego sprawdzenia</h2>
          {flags.length
            ? flags.map((flag) => <p key={flag.id}><strong>{flag.weapon?.registryRef ?? flag.entityId}</strong> — {flag.reason} <span className="muted">({formatDateTime(flag.createdAt)})</span></p>)
            : <InlineAlert tone="success">Brak nierozwiązanych flag kontroli.</InlineAlert>}
        </section>
      </div>
      <section className="page-card">
        <h2 className="section-heading">Ostatnie operacje</h2>
        <div className="paper-table-wrap"><table className="paper-table"><thead><tr><th>Data</th><th>Operacja</th><th>Typ</th><th>Użytkownik</th></tr></thead><tbody>{operations.map((event) => <tr key={event.id}><td>{formatDateTime(event.timestamp)}</td><td>{labelFor(auditOperationLabels, event.operation, "Inna operacja")}</td><td>{labelFor(auditEntityTypeLabels, event.entityType, "Inny obiekt")}</td><td>{event.userSnapshot ?? "System"}</td></tr>)}</tbody></table></div>
      </section>
      <p className="small muted">Raport wspiera kontrolę ewidencji; nie zastępuje fizycznego sprawdzenia magazynu. <Link href="/administration/audit">Sprawdź integralność audytu</Link>.</p>
    </div>
  );
}
