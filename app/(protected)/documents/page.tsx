import { prisma } from "@/lib/db";
import { formatDate } from "@/lib/utils";
import { PageHeader } from "@/components/page-header";
import { DocumentForm } from "@/components/entity-forms";

export const metadata = { title: "Dokumenty" };
export default async function Page() {
  const documents = await prisma.document.findMany({ include: { attachments: true }, orderBy: { documentDate: "desc" } });
  return <div className="page"><PageHeader eyebrow="Dokumenty / raporty" title="Dokumenty" description="Wspólny rejestr podstaw nabycia, przekazania, wycofania i upoważnień." /><section className="page-card"><h2 className="section-heading">Dodaj dokument</h2><DocumentForm /></section><section className="page-card"><h2 className="section-heading">Rejestr dokumentów</h2><div className="paper-table-wrap"><table className="paper-table"><thead><tr><th>Data</th><th>Typ</th><th>Numer</th><th>Opis</th><th>Podmioty</th><th>Załączniki</th></tr></thead><tbody>{documents.map((document) => <tr key={document.id}><td>{formatDate(document.documentDate)}</td><td>{document.type}</td><td>{document.number ?? "—"}</td><td>{document.description}</td><td>{document.parties ?? "—"}</td><td>{document.attachments.length ? document.attachments.map((file) => <a href={`/api/attachments?id=${file.id}`} target="_blank" rel="noreferrer" key={file.id}>{file.originalName}</a>) : "—"}</td></tr>)}</tbody></table></div></section></div>;
}
