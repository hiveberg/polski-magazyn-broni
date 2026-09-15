import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { PageHeader } from "@/components/page-header";
import { BackupControls } from "@/components/entity-forms";
import { formatDateTime } from "@/lib/utils";
import { backupStatusLabels, backupTypeLabels, labelFor } from "@/lib/labels";

export const metadata = { title: "Kopie zapasowe" };
export default async function Page() {
  await requireUser({ admin: true });
  const [backups, backupSetting] = await Promise.all([
    prisma.backupRecord.findMany({ orderBy: { createdAt: "desc" }, take: 100 }),
    prisma.systemSetting.findUnique({ where: { key: "backupSchedule" } }),
  ]);
  const last = backups.find((backup) => backup.status === "SUCCESS");
  const schedule = (backupSetting?.value ?? { enabled: true, hour: 2, minute: 0 }) as { enabled?: boolean; hour?: number; minute?: number };
  const scheduleLabel = schedule.enabled === false ? "Wyłączony" : `Codziennie ${String(schedule.hour ?? 2).padStart(2, "0")}:${String(schedule.minute ?? 0).padStart(2, "0")}`;
  return <div className="page"><PageHeader eyebrow="Administracja" title="Kopie zapasowe" description="Pakiet zawiera migawkę SQLite, załączniki, manifest i sumy SHA-256." /><section className="page-card"><div className="kpis" style={{ gridTemplateColumns: "repeat(3, minmax(160px,1fr))" }}><div className="kpi"><div><span>Ostatnia poprawna kopia</span><strong style={{ fontSize: "1.05rem" }}>{formatDateTime(last?.completedAt)}</strong></div></div><div className="kpi"><div><span>Harmonogram</span><strong style={{ fontSize: "1.05rem" }}>{scheduleLabel}</strong></div></div><div className="kpi"><div><span>Status</span><strong style={{ fontSize: "1.05rem" }} className={last ? "green" : "amber"}>{last ? "OK" : "Brak kopii"}</strong></div></div></div><BackupControls /></section><section className="page-card"><h2 className="section-heading">Historia kopii</h2><div className="paper-table-wrap"><table className="paper-table"><thead><tr><th>Data</th><th>Typ</th><th>Plik</th><th>Wynik</th><th>Hash</th><th>Błąd</th></tr></thead><tbody>{backups.map((backup) => <tr key={backup.id}><td>{formatDateTime(backup.createdAt)}</td><td>{labelFor(backupTypeLabels, backup.type, "Inny typ kopii")}</td><td>{backup.filename}</td><td><span className={`badge ${backup.status === "SUCCESS" ? "ok" : backup.status === "FAILED" ? "bad" : "warn"}`}>{labelFor(backupStatusLabels, backup.status, "Nieznany wynik")}</span></td><td>{backup.sha256?.slice(0, 16) ?? "—"}</td><td>{backup.errorMessage ?? "—"}</td></tr>)}</tbody></table></div></section></div>;
}
