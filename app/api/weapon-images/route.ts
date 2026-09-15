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
    await assertSameOrigin(request); const actor = await requireApiUser(); const form = await request.formData(); const file = form.get("file"); const weaponId = String(form.get("weaponId") ?? "");
    if (!(file instanceof File) || !weaponId) throw new DomainError("Wybierz zdjęcie i broń.", "INVALID_UPLOAD");
    if (!await prisma.weapon.findUnique({ where: { id: weaponId } })) throw new DomainError("Broń nie istnieje.", "INVALID_WEAPON");
    const { buffer, extension } = await validateUpload(file, { imagesOnly: true });
    await ensureDataDirectories(); const storageName = `weapons/${randomUUID()}${extension}`; const target = safeChild(uploadsPath, storageName);
    await mkdir(dirname(target), { recursive: true }); await writeFile(target, buffer, { flag: "wx", mode: 0o600 });
    try {
      const image = await prisma.$transaction(async (tx) => {
        const created = await tx.weaponImage.create({ data: { weaponId, storageName, originalName: file.name.slice(0, 255), mimeType: file.type, sizeBytes: file.size, sha256: sha256(buffer), uploadedById: actor.id } });
        await appendAudit(tx, { userId: actor.id, userSnapshot: `${actor.firstName} ${actor.lastName}`, operation: "WEAPON_IMAGE_ADDED", entityType: "WeaponImage", entityId: created.id, sessionId: actor.sessionId, payload: { weaponId, originalName: created.originalName, sha256: created.sha256 } });
        return created;
      });
      return Response.json({ image }, { status: 201 });
    } catch (error) { await rm(target, { force: true }); throw error; }
  } catch (error) { return errorResponse(error); }
}

export async function GET(request: Request) {
  try { await requireApiUser(); const id = new URL(request.url).searchParams.get("id") ?? ""; const image = await prisma.weaponImage.findUnique({ where: { id } }); if (!image) throw new DomainError("Nie znaleziono zdjęcia.", "IMAGE_NOT_FOUND", 404); return new Response(await readFile(safeChild(uploadsPath, image.storageName)), { headers: { "Content-Type": image.mimeType, "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(image.originalName)}`, "Cache-Control": "private, max-age=3600" } }); }
  catch (error) { return errorResponse(error); }
}

export async function DELETE(request: Request) {
  try {
    await assertSameOrigin(request); const actor = await requireApiUser(); const id = new URL(request.url).searchParams.get("id") ?? ""; const image = await prisma.weaponImage.findUnique({ where: { id } }); if (!image) throw new DomainError("Nie znaleziono zdjęcia.", "IMAGE_NOT_FOUND", 404);
    await prisma.$transaction(async (tx) => { await tx.weaponImage.delete({ where: { id } }); await appendAudit(tx, { userId: actor.id, userSnapshot: `${actor.firstName} ${actor.lastName}`, operation: "WEAPON_IMAGE_DELETED", entityType: "WeaponImage", entityId: id, sessionId: actor.sessionId, payload: { weaponId: image.weaponId, originalName: image.originalName, sha256: image.sha256 } }); });
    await rm(safeChild(uploadsPath, image.storageName), { force: true }); return Response.json({ ok: true });
  } catch (error) { return errorResponse(error); }
}
