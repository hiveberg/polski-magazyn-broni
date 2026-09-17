import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { DocumentDetailEditor } from "@/components/document-controls";
import { documentTypeLabels, labelFor } from "@/lib/labels";
import { buildDocumentOperations } from "@/lib/document-operations";

export const metadata = { title: "Podgląd dokumentu" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; const document = await prisma.document.findUnique({ where: { id }, include: { attachments: { orderBy: { createdAt: "desc" } }, weaponEntries: { include: { weapon: { select: { id: true, registryRef: true, name: true } } } }, ammoEntries: { include: { caliber: { select: { canonicalName: true } } } }, authorizations: { include: { user: { select: { firstName: true, lastName: true } } } }, weapons: { select: { id: true, registryRef: true, name: true, registeredAt: true } }, weaponEvents: { include: { weapon: { select: { id: true, registryRef: true, name: true } } } } } }); if (!document) notFound();
  const operations = buildDocumentOperations(document);
  const value = { ...document, documentDate: document.documentDate.toISOString(), createdAt: document.createdAt.toISOString(), attachments: document.attachments.map((file) => ({ ...file, createdAt: file.createdAt.toISOString() })), referenceCount: operations.length, operations };
  return <div className="page"><PageHeader eyebrow="Dokumenty" title={`${labelFor(documentTypeLabels, document.type, "Inny dokument")} ${document.number || "bez numeru"}`} description={document.description} /><section className="page-card"><DocumentDetailEditor document={value} /></section></div>;
}
