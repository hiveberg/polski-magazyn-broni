import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { PageHeader } from "@/components/page-header";
import { BookForm } from "@/components/entity-forms";
import { formatDate } from "@/lib/utils";
import { bookTypeLabels, labelFor } from "@/lib/labels";
import { CreatePanel, EmptyState } from "@/components/ui-system";

export const metadata = { title: "Książki" };
export default async function Page() {
  await requireUser({ admin: true }); const books = await prisma.registerBook.findMany({ orderBy: { series: "asc" } });
  return <div className="page"><PageHeader eyebrow="Administracja" title="Książki i serie" description="Numeracja pozycji jest sekwencyjna, nigdy nie jest cofana ani ponownie używana." /><CreatePanel hasItems={books.length > 0} title="Nowa księga" buttonLabel="Dodaj księgę"><BookForm /></CreatePanel><section className="page-card">{books.length ? <div className="paper-table-wrap"><table className="paper-table"><thead><tr><th>Seria</th><th>Nazwa</th><th>Typ</th><th>Następna Lp.</th><th>Utworzona</th><th>Status</th></tr></thead><tbody>{books.map((book) => <tr key={book.id}><td className="registry-ref">{book.series}</td><td>{book.name}</td><td>{labelFor(bookTypeLabels, book.type, "Inny typ księgi")}</td><td>{book.nextPosition}</td><td>{formatDate(book.createdAt)}</td><td><span className={`badge ${book.status === "ACTIVE" ? "ok" : "bad"}`}>{book.status === "ACTIVE" ? "Aktywna" : "Zamknięta"}</span></td></tr>)}</tbody></table></div> : <EmptyState title="Brak ksiąg" description="Utwórz pierwszą księgę, aby rozpocząć ewidencję." />}</section></div>;
}
