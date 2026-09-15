import { Suspense } from "react";
import Link from "next/link";
import { Archive, ArrowUpFromLine, Boxes, History, ShieldCheck, Users, Warehouse } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { formatDateTime } from "@/lib/utils";
import { OperationLauncher } from "@/components/operation-launcher";
import { auditOperationLabels, labelFor } from "@/lib/labels";
import { getAmmoStockBalances, sumAmmoStock } from "@/lib/ammunition-stock";

export const metadata = { title: "Pulpit" };

export default async function DashboardPage() {
  const user = await requireUser();
  const [weaponTotal, inStorage, issuedCount, activeUsers, recent, activeWeaponIssues, activeAmmoIssues, ammoBalances] = await Promise.all([
    prisma.weapon.count(),
    prisma.weapon.count({ where: { status: "IN_STORAGE" } }),
    prisma.weapon.count({ where: { status: "ISSUED" } }),
    prisma.user.count({ where: { active: true, isBootstrap: false } }),
    prisma.auditEvent.findMany({ orderBy: { sequence: "desc" }, take: 6 }),
    prisma.weaponIssue.findMany({ where: { status: "ACTIVE" }, include: { weapon: { include: { caliber: true } } }, orderBy: { issuedAt: "desc" }, take: 8 }),
    prisma.ammoIssue.findMany({ where: { status: "ACTIVE" }, include: { caliber: true, weaponIssue: { include: { weapon: true } } }, orderBy: { issuedAt: "desc" }, take: 8 }),
    getAmmoStockBalances(prisma),
  ]);

  const grouped = await prisma.ammunitionRegisterEntry.groupBy({
    by: ["caliberId"],
    _sum: { quantityIn: true, quantityOut: true },
    orderBy: { _sum: { quantityIn: "desc" } },
    take: 6,
  });
  const [calibers, recentWeapons, recentIssues, recentAmmoIssues] = await Promise.all([
    prisma.caliber.findMany({ where: { id: { in: grouped.map((row) => row.caliberId) } } }),
    prisma.weapon.findMany({ where: { id: { in: recent.filter((event) => event.entityType === "Weapon").map((event) => event.entityId).filter((id): id is string => Boolean(id)) } }, select: { id: true, registryRef: true } }),
    prisma.weaponIssue.findMany({ where: { id: { in: recent.filter((event) => event.entityType === "WeaponIssue").map((event) => event.entityId).filter((id): id is string => Boolean(id)) } }, include: { weapon: { select: { id: true, registryRef: true } } } }),
    prisma.ammoIssue.findMany({ where: { id: { in: recent.filter((event) => event.entityType === "AmmoIssue").map((event) => event.entityId).filter((id): id is string => Boolean(id)) } }, include: { weaponIssue: { include: { weapon: { select: { id: true, registryRef: true } } } } } }),
  ]);
  const caliberMap = new Map(calibers.map((caliber) => [caliber.id, caliber.canonicalName]));
  const recentWeaponLinks = new Map<string, { id: string; registryRef: string }>();
  for (const weapon of recentWeapons) recentWeaponLinks.set(`Weapon:${weapon.id}`, weapon);
  for (const issue of recentIssues) recentWeaponLinks.set(`WeaponIssue:${issue.id}`, issue.weapon);
  for (const issue of recentAmmoIssues) if (issue.weaponIssue?.weapon) recentWeaponLinks.set(`AmmoIssue:${issue.id}`, issue.weaponIssue.weapon);

  const ammoTotals = sumAmmoStock(ammoBalances.values());
  const stockByCaliber = new Map<string, { ledger: number; reserved: number; available: number }>();
  for (const balance of ammoBalances.values()) {
    const current = stockByCaliber.get(balance.caliberId) ?? { ledger: 0, reserved: 0, available: 0 };
    stockByCaliber.set(balance.caliberId, { ledger: current.ledger + balance.ledger, reserved: current.reserved + balance.reserved, available: current.available + balance.available });
  }
  const now = new Date();
  const date = new Intl.DateTimeFormat("pl-PL", { timeZone: "Europe/Warsaw", weekday: "long", day: "2-digit", month: "long", year: "numeric" }).format(now);
  const time = new Intl.DateTimeFormat("pl-PL", { timeZone: "Europe/Warsaw", hour: "2-digit", minute: "2-digit" }).format(now);

  return (
    <div className="page">
      <div className="page-header">
        <div><p className="eyebrow">Ewidencja • Kontrola • Bezpieczeństwo</p><h1>Magazyn broni</h1><p className="subtitle">Stan operacyjny obliczony ze wszystkich ksiąg i wpisów.</p></div>
        <div className="clock">{date}<strong>{time}</strong></div>
      </div>
      <Suspense><OperationLauncher operatorName={`${user.firstName} ${user.lastName}`} /></Suspense>
      <div className="kpis">
        <div className="kpi"><Archive /><div><span>Broń ogółem</span><strong>{weaponTotal}</strong></div></div>
        <div className="kpi"><Warehouse /><div><span>W magazynie</span><strong>{inStorage}</strong></div></div>
        <div className="kpi"><ArrowUpFromLine /><div><span>Wydane sztuki</span><strong>{issuedCount}</strong></div></div>
        <div className="kpi"><Boxes /><div><span>Amunicja dostępna</span><strong>{ammoTotals.available.toLocaleString("pl-PL")}</strong><small>Ewidencyjnie {ammoTotals.ledger.toLocaleString("pl-PL")} • blokady {ammoTotals.reserved.toLocaleString("pl-PL")}</small></div></div>
        <div className="kpi"><Users /><div><span>Aktywni użytkownicy</span><strong>{activeUsers}</strong></div></div>
      </div>
      <div className="dashboard-grid">
        <section className="panel">
          <div className="panel-header"><h2 className="panel-title"><History size={19} />Ostatnie operacje</h2></div>
          <div className="paper-table-wrap"><table className="paper-table"><thead><tr><th>Data i godzina</th><th>Operacja</th><th>Obiekt</th><th>Użytkownik</th></tr></thead><tbody>
            {recent.length ? recent.map((event) => {
              const linkedWeapon = event.entityId ? recentWeaponLinks.get(`${event.entityType}:${event.entityId}`) : undefined;
              return <tr key={event.id}><td>{formatDateTime(event.timestamp)}</td><td>{labelFor(auditOperationLabels, event.operation, "Inna operacja")}</td><td>{linkedWeapon ? <Link className="registry-link" href={`/weapons/${linkedWeapon.id}`}>{linkedWeapon.registryRef}</Link> : event.entityId?.slice(0, 12) ?? "—"}</td><td>{event.userSnapshot ?? "System"}</td></tr>;
            }) : <tr><td colSpan={4} className="muted">Brak operacji. Dodaj pierwszą pozycję do ewidencji.</td></tr>}
          </tbody></table></div>
        </section>
        <section className="panel warning">
          <div className="panel-header"><h2 className="panel-title"><ShieldCheck size={19} className="amber" />Niezakończone wydania amunicji</h2></div>
          <div className="paper-table-wrap"><table className="paper-table"><thead><tr><th>Data</th><th>Kaliber</th><th>Ilość</th><th>Odbiorca</th><th>Powiązanie</th></tr></thead><tbody>
            {activeAmmoIssues.length ? activeAmmoIssues.map((issue) => <tr key={issue.id}><td>{formatDateTime(issue.issuedAt)}</td><td>{issue.caliberSnapshot}</td><td>{issue.quantityIssued} szt.</td><td>{issue.recipientName}</td><td>{issue.weaponIssue?.weapon.id ? <Link className="record-link" href={`/weapons/${issue.weaponIssue.weapon.id}`}>Broń {issue.weaponIssue.weapon.registryRef}</Link> : "—"}</td></tr>) : <tr><td colSpan={5} className="muted">Brak niezakończonych wydań.</td></tr>}
          </tbody></table></div>
        </section>
        <section className="panel">
          <div className="panel-header"><h2 className="panel-title"><Warehouse size={19} />Aktualnie wydana broń</h2></div>
          <div className="paper-table-wrap"><table className="paper-table"><thead><tr><th>Pozycja</th><th>Nazwa / marka</th><th>Kaliber</th><th>Wydana dla</th></tr></thead><tbody>
            {activeWeaponIssues.length ? activeWeaponIssues.map((issue) => <tr key={issue.id}><td><Link className="registry-link" href={`/weapons/${issue.weapon.id}`}>{issue.weapon.registryRef}</Link></td><td><Link className="record-link" href={`/weapons/${issue.weapon.id}`}>{issue.weapon.displayName || issue.weapon.name}</Link></td><td>{issue.weapon.caliber.canonicalName}</td><td>{issue.recipientName}</td></tr>) : <tr><td colSpan={4} className="muted">Żaden egzemplarz nie jest obecnie wydany.</td></tr>}
          </tbody></table></div>
        </section>
        <section className="panel">
          <div className="panel-header"><h2 className="panel-title"><Boxes size={19} className="amber" />Stan amunicji</h2><Link className="panel-link" href="/ammunition">Pełny widok</Link></div>
          <div className="paper-table-wrap"><table className="paper-table"><thead><tr><th>Kaliber</th><th>Ewidencyjny</th><th>Zablokowany</th><th>Dostępny</th><th>Przychód</th><th>Rozchód</th></tr></thead><tbody>
            {grouped.length ? grouped.map((row) => { const stock = stockByCaliber.get(row.caliberId) ?? { ledger: 0, reserved: 0, available: 0 }; return <tr key={row.caliberId}><td>{caliberMap.get(row.caliberId)}</td><td>{stock.ledger.toLocaleString("pl-PL")}</td><td>{stock.reserved.toLocaleString("pl-PL")}</td><td><strong>{stock.available.toLocaleString("pl-PL")}</strong></td><td>{(row._sum.quantityIn ?? 0).toLocaleString("pl-PL")}</td><td>{(row._sum.quantityOut ?? 0).toLocaleString("pl-PL")}</td></tr>; }) : <tr><td colSpan={6} className="muted">Brak wpisów amunicji.</td></tr>}
          </tbody></table></div>
        </section>
      </div>
    </div>
  );
}
