import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { DocumentDetailEditor } from "@/components/document-controls";
import { documentTypeLabels, labelFor } from "@/lib/labels";

export const metadata = { title: "Podgląd dokumentu" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; const document = await prisma.document.findUnique({ where: { id }, include: { attachments: { orderBy: { createdAt: "desc" } }, _count: { select: { weapons: true, weaponEntries: true, ammoEntries: true, weaponEvents: true, authorizations: true } } } }); if (!document) notFound();
  const value = { ...document, documentDate: document.documentDate.toISOString(), createdAt: document.createdAt.toISOString(), attachments: document.attachments.map((file) => ({ ...file, createdAt: file.createdAt.toISOString() })), referenceCount: Object.values(document._count).reduce((sum, count) => sum + count, 0) };
  return <div className="page"><PageHeader eyebrow="Dokumenty" title={`${labelFor(documentTypeLabels, document.type, "Inny dokument")} ${document.number || "bez numeru"}`} description={document.description} /><section className="page-card"><DocumentDetailEditor document={value} /></section></div>;
}
