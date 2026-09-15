import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { PageHeader } from "@/components/page-header";
import { AuditVerifier } from "@/components/entity-forms";
import { formatDateTime } from "@/lib/utils";
import { auditEntityTypeLabels, auditOperationLabels, labelFor } from "@/lib/labels";

export const metadata = { title: "Audyt" };
export default async function Page() {
  await requireUser({ admin: true }); const events = await prisma.auditEvent.findMany({ orderBy: { sequence: "desc" }, take: 250 });
  return (
    <div className="page">
      <PageHeader eyebrow="Administracja" title="Audyt i integralność" description="Rejestr jest append-only. Każdy wpis zawiera hash poprzedniego wpisu." />
      <section className="page-card"><AuditVerifier /></section>
      <section className="page-card">
        <div className="paper-table-wrap">
          <table className="paper-table">
            <thead><tr><th>Nr</th><th>Data</th><th>Operacja</th><th>Obiekt</th><th>Użytkownik</th><th>Hash</th></tr></thead>
            <tbody>{events.map((event) => <tr key={event.id}><td>{event.sequence}</td><td>{formatDateTime(event.timestamp)}</td><td>{labelFor(auditOperationLabels, event.operation, "Inna operacja")}</td><td>{labelFor(auditEntityTypeLabels, event.entityType, "Inny obiekt")}{event.entityId ? ` / ${event.entityId.slice(0, 10)}` : ""}</td><td>{event.userSnapshot ?? "System"}</td><td title={event.auditHash}>{event.auditHash.slice(0, 16)}…</td></tr>)}</tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
