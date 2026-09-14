import { randomUUID } from "node:crypto";
import { extname } from "node:path";
import { readFile, rm, writeFile } from "node:fs/promises";
import { prisma } from "@/lib/db";
import { appendAudit, sha256 } from "@/lib/domain/audit";
import { requireApiUser } from "@/lib/auth/session";
import { assertSameOrigin } from "@/lib/auth/security";
import { ensureDataDirectories, safeChild, uploadsPath } from "@/lib/paths";
import { errorResponse, DomainError } from "@/lib/errors";

const allowed = new Map([["application/pdf", ".pdf"], ["image/jpeg", ".jpg"], ["image/png", ".png"], ["image/webp", ".webp"]]);

function validSignature(mimeType: string, buffer: Buffer) {
  if (mimeType === "application/pdf") return buffer.subarray(0, 5).toString("ascii") === "%PDF-";
  if (mimeType === "image/jpeg") return buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  if (mimeType === "image/png") return buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  if (mimeType === "image/webp") return buffer.subarray(0, 4).toString("ascii") === "RIFF" && buffer.subarray(8, 12).toString("ascii") === "WEBP";
  return false;
}

export async function POST(request: Request) {
  try {
    await assertSameOrigin(request); const actor = await requireApiUser(); const form = await request.formData(); const file = form.get("file"); const documentId = String(form.get("documentId") ?? "");
    if (!(file instanceof File) || !documentId) throw new DomainError("Wybierz plik i dokument.", "INVALID_UPLOAD");
    if (!allowed.has(file.type) || file.size > 8 * 1024 * 1024) throw new DomainError("Dozwolone są PDF, JPG, PNG i WebP do 8 MB.", "UNSUPPORTED_UPLOAD");
    if (!await prisma.document.findUnique({ where: { id: documentId } })) throw new DomainError("Dokument nie istnieje.", "INVALID_DOCUMENT");
    await ensureDataDirectories(); const storageName = `${randomUUID()}${allowed.get(file.type) ?? extname(file.name)}`; const buffer = Buffer.from(await file.arrayBuffer());
    if (!validSignature(file.type, buffer)) throw new DomainError("Zawartość pliku nie odpowiada deklarowanemu formatowi.", "INVALID_FILE_SIGNATURE");
    const target = safeChild(uploadsPath, storageName);
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
