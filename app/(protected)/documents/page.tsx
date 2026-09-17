import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { DocumentForm } from "@/components/document-form";
import { DocumentRegistry } from "@/components/document-controls";
import { CreatePanel, EmptyState } from "@/components/ui-system";
import { buildDocumentOperations } from "@/lib/document-operations";

export const metadata = { title: "Dokumenty" };
export default async function Page() {
  const documents = await prisma.document.findMany({ include: { attachments: true, weaponEntries: { include: { weapon: { select: { id: true, registryRef: true, name: true } } } }, ammoEntries: { include: { caliber: { select: { canonicalName: true } } }, }, authorizations: { include: { user: { select: { firstName: true, lastName: true } } } }, weapons: { select: { id: true, registryRef: true, name: true, registeredAt: true } }, weaponEvents: { include: { weapon: { select: { id: true, registryRef: true, name: true } } } } }, orderBy: { documentDate: "desc" } });
  const rows = documents.map((document) => { const operations = buildDocumentOperations(document); return { ...document, documentDate: document.documentDate.toISOString(), createdAt: document.createdAt.toISOString(), attachments: document.attachments.map((file) => ({ ...file, createdAt: file.createdAt.toISOString() })), referenceCount: operations.length, operations }; });
  return <div className="page"><PageHeader eyebrow="Dokumenty / raporty" title="Dokumenty" description="Wspólny rejestr podstaw nabycia, przekazania, wycofania i upoważnień." /><CreatePanel hasItems={documents.length > 0} title="Nowy dokument" buttonLabel="Dodaj dokument"><DocumentForm /></CreatePanel><section className="page-card"><h2 className="section-heading">Rejestr dokumentów</h2>{rows.length ? <DocumentRegistry documents={rows} /> : <EmptyState title="Brak dokumentów" description="Dodaj pierwszy dokument wraz z potrzebnymi załącznikami." />}</section></div>;
}
