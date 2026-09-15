import { randomUUID } from "node:crypto";
import { dirname } from "node:path";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { prisma } from "@/lib/db";
import { appendAudit, sha256 } from "@/lib/domain/audit";
import { requireApiUser } from "@/lib/auth/session";
import { assertSameOrigin } from "@/lib/auth/security";
import { ensureDataDirectories, safeChild, uploadsPath } from "@/lib/paths";
import { errorResponse, DomainError } from "@/lib/errors";
import { validateUpload } from "@/lib/upload";

export async function POST(request: Request) {
  try {
    await assertSameOrigin(request); const actor = await requireApiUser(); const form = await request.formData(); const file = form.get("file"); const documentId = String(form.get("documentId") ?? "");
    if (!(file instanceof File) || !documentId) throw new DomainError("Wybierz plik i dokument.", "INVALID_UPLOAD");
    if (!await prisma.document.findUnique({ where: { id: documentId } })) throw new DomainError("Dokument nie istnieje.", "INVALID_DOCUMENT");
    const { buffer, extension } = await validateUpload(file);
    await ensureDataDirectories(); const storageName = `documents/${randomUUID()}${extension}`;
    const target = safeChild(uploadsPath, storageName);
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, buffer, { flag: "wx", mode: 0o600 });
    let attachment;
    try {
      attachment = await prisma.$transaction(async (tx) => { const created = await tx.attachment.create({ data: { documentId, storageName, originalName: file.name.slice(0, 255), mimeType: file.type, sizeBytes: file.size, sha256: sha256(buffer), uploadedById: actor.id } }); await appendAudit(tx, { userId: actor.id, userSnapshot: `${actor.firstName} ${actor.lastName}`, operation: "ATTACHMENT_ADDED", entityType: "Attachment", entityId: created.id, sessionId: actor.sessionId, payload: { documentId, originalName: created.originalName, mimeType: created.mimeType, sizeBytes: created.sizeBytes, sha256: created.sha256 } }); return created; });
    } catch (error) {
      await rm(target, { force: true });
      throw error;
    }
    return Response.json({ attachment }, { status: 201 });
  } catch (error) { return errorResponse(error); }
}

export async function GET(request: Request) {
  try { await requireApiUser(); const id = new URL(request.url).searchParams.get("id") ?? ""; const attachment = await prisma.attachment.findUnique({ where: { id } }); if (!attachment) throw new DomainError("Nie znaleziono załącznika.", "ATTACHMENT_NOT_FOUND", 404); return new Response(await readFile(safeChild(uploadsPath, attachment.storageName)), { headers: { "Content-Type": attachment.mimeType, "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(attachment.originalName)}`, "Cache-Control": "private, no-store" } }); }
  catch (error) { return errorResponse(error); }
}

export async function DELETE(request: Request) {
  try {
    await assertSameOrigin(request); const actor = await requireApiUser(); const id = new URL(request.url).searchParams.get("id") ?? "";
    const attachment = await prisma.attachment.findUnique({ where: { id } });
    if (!attachment) throw new DomainError("Nie znaleziono załącznika.", "ATTACHMENT_NOT_FOUND", 404);
    await prisma.$transaction(async (tx) => {
      await tx.attachment.delete({ where: { id } });
      await appendAudit(tx, { userId: actor.id, userSnapshot: `${actor.firstName} ${actor.lastName}`, operation: "ATTACHMENT_DELETED", entityType: "Attachment", entityId: id, sessionId: actor.sessionId, payload: { documentId: attachment.documentId, originalName: attachment.originalName, sha256: attachment.sha256 } });
    });
    await rm(safeChild(uploadsPath, attachment.storageName), { force: true });
    return Response.json({ ok: true });
  } catch (error) { return errorResponse(error); }
}
