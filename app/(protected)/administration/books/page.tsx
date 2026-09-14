import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { PageHeader } from "@/components/page-header";
import { BookForm } from "@/components/entity-forms";
import { formatDate } from "@/lib/utils";

export const metadata = { title: "Książki" };
export default async function Page() {
  await requireUser({ admin: true }); const books = await prisma.registerBook.findMany({ orderBy: { series: "asc" } });
  return <div className="page"><PageHeader eyebrow="Administracja" title="Książki i serie" description="Numeracja pozycji jest sekwencyjna, nigdy nie jest cofana ani ponownie używana." /><section className="page-card"><h2 className="section-heading">Nowa księga</h2><BookForm /></section><section className="page-card"><div className="paper-table-wrap"><table className="paper-table"><thead><tr><th>Seria</th><th>Nazwa</th><th>Typ</th><th>Następna Lp.</th><th>Utworzona</th><th>Status</th></tr></thead><tbody>{books.map((book) => <tr key={book.id}><td className="registry-ref">{book.series}</td><td>{book.name}</td><td>{book.type}</td><td>{book.nextPosition}</td><td>{formatDate(book.createdAt)}</td><td><span className={`badge ${book.status === "ACTIVE" ? "ok" : "bad"}`}>{book.status === "ACTIVE" ? "Aktywna" : "Zamknięta"}</span></td></tr>)}</tbody></table></div></section></div>;
}
