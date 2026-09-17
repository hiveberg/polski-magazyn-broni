import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { PageHeader } from "@/components/page-header";
import { RecipientForm } from "@/components/recipient-controls";
import { CreatePanel, EmptyState } from "@/components/ui-system";
import { formatDateTime } from "@/lib/utils";

export const metadata = { title: "Lista odbiorców" };

export default async function Page() {
  await requireUser({ admin: true });
  const recipients = await prisma.recipient.findMany({ orderBy: [{ name: "asc" }, { createdAt: "asc" }] });
  return <div className="page"><PageHeader eyebrow="Administracja" title="Lista odbiorców" description="Pomocnicza kartoteka używana podczas wydawania broni i amunicji. Wpisanie odbiorcy ręcznie nadal jest zawsze możliwe." /><CreatePanel hasItems={recipients.length > 0} title="Nowy odbiorca" buttonLabel="Dodaj odbiorcę"><RecipientForm /></CreatePanel><section className="page-card"><h2 className="section-heading">Odbiorcy</h2>{recipients.length ? <div className="paper-table-wrap"><table className="paper-table"><thead><tr><th>Nazwa odbiorcy</th><th>Dokument / identyfikator</th><th>Dodany przez</th><th>Data dodania</th></tr></thead><tbody>{recipients.map((recipient) => <tr key={recipient.id}><td><strong>{recipient.name}</strong></td><td>{recipient.reference || "—"}</td><td>{recipient.createdByName}</td><td>{formatDateTime(recipient.createdAt)}</td></tr>)}</tbody></table></div> : <EmptyState title="Brak zapisanych odbiorców" description="Dodaj pierwszego odbiorcę albo wpisuj dane ręcznie podczas wydania." />}</section></div>;
}
