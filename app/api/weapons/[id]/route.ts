import { z } from "zod";
import { prisma } from "@/lib/db";
import { appendAudit } from "@/lib/domain/audit";
import { requireApiUser } from "@/lib/auth/session";
import { assertSameOrigin } from "@/lib/auth/security";
import { errorResponse, DomainError } from "@/lib/errors";

const schema = z.object({ displayName: z.string().trim().max(120).nullable(), magazineCount: z.coerce.number().int().min(0).max(1000) });

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await assertSameOrigin(request); const actor = await requireApiUser(); const { id } = await params; const input = schema.parse(await request.json());
    const previous = await prisma.weapon.findUnique({ where: { id }, select: { displayName: true, magazineCount: true } }); if (!previous) throw new DomainError("Nie znaleziono broni.", "WEAPON_NOT_FOUND", 404);
    const weapon = await prisma.$transaction(async (tx) => { const updated = await tx.weapon.update({ where: { id }, data: { displayName: input.displayName || null, magazineCount: input.magazineCount } }); await appendAudit(tx, { userId: actor.id, userSnapshot: `${actor.firstName} ${actor.lastName}`, operation: "WEAPON_METADATA_UPDATED", entityType: "Weapon", entityId: id, sessionId: actor.sessionId, payload: { previousDisplayName: previous.displayName, displayName: updated.displayName, previousMagazineCount: previous.magazineCount, magazineCount: updated.magazineCount } }); return updated; });
    return Response.json({ weapon });
  } catch (error) { return errorResponse(error); }
}
