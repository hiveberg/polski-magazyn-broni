import { rm } from "node:fs/promises";
import { prisma } from "@/lib/db";
import { appendAudit } from "@/lib/domain/audit";
import { DomainError } from "@/lib/errors";
import { safeChild, uploadsPath } from "@/lib/paths";
import type { CurrentUser } from "@/lib/auth/session";

export async function deleteDocument(id: string, actor: CurrentUser) {
  const document = await prisma.document.findUnique({
    where: { id },
    include: {
      attachments: true,
      weapons: { select: { registryRef: true } },
      weaponEntries: { select: { registryRef: true } },
      ammoEntries: { select: { registryRef: true } },
      weaponEvents: { select: { id: true } },
      authorizations: { select: { userId: true } },
    },
  });
  if (!document) throw new DomainError("Nie znaleziono dokumentu.", "DOCUMENT_NOT_FOUND", 404);
  const references = [
    ...document.weapons.map((item) => `broń ${item.registryRef}`),
    ...document.weaponEntries.map((item) => `wpis broni ${item.registryRef}`),
    ...document.ammoEntries.map((item) => `wpis amunicji ${item.registryRef}`),
    ...document.weaponEvents.map(() => "zdarzenie broni"),
    ...document.authorizations.map(() => "upoważnienie użytkownika"),
  ];
  if (references.length) {
    throw new DomainError(`Nie można usunąć dokumentu, ponieważ jest używany przez: ${[...new Set(references)].slice(0, 8).join(", ")}.`, "DOCUMENT_IN_USE", 409);
  }
  await prisma.$transaction(async (tx) => {
    await tx.attachment.deleteMany({ where: { documentId: id } });
    await tx.document.delete({ where: { id } });
    await appendAudit(tx, {
      userId: actor.id,
      userSnapshot: `${actor.firstName} ${actor.lastName}`,
      operation: "DOCUMENT_DELETED",
      entityType: "Document",
      entityId: id,
      sessionId: actor.sessionId,
      payload: { type: document.type, number: document.number, attachmentHashes: document.attachments.map((file) => file.sha256) },
    });
  });
  await Promise.all(document.attachments.map((file) => rm(safeChild(uploadsPath, file.storageName), { force: true })));
}
