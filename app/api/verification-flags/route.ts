import { z } from "zod";
import { prisma } from "@/lib/db";
import { appendAudit } from "@/lib/domain/audit";
import { requireApiUser } from "@/lib/auth/session";
import { assertSameOrigin } from "@/lib/auth/security";
import { errorResponse, DomainError } from "@/lib/errors";

const createSchema = z.object({ weaponId: z.string().min(1), reason: z.string().trim().min(5).max(500) });
const resolveSchema = z.object({ id: z.string().min(1) });
export async function POST(request: Request) {
  try { await assertSameOrigin(request); const actor = await requireApiUser(); const input = createSchema.parse(await request.json()); const weapon = await prisma.weapon.findUnique({ where: { id: input.weaponId } }); if (!weapon) throw new DomainError("Nie znaleziono broni.", "WEAPON_NOT_FOUND"); const flag = await prisma.$transaction(async (tx) => { const created = await tx.physicalVerificationFlag.create({ data: { weaponId: weapon.id, entityType: "Weapon", entityId: weapon.id, reason: input.reason, createdById: actor.id, createdByName: `${actor.firstName} ${actor.lastName}` } }); await tx.weaponEvent.create({ data: { weaponId: weapon.id, type: "FLAGGED", effectiveAt: new Date(), snapshot: { reason: input.reason }, performedById: actor.id, performedByName: `${actor.firstName} ${actor.lastName}` } }); await appendAudit(tx, { userId: actor.id, userSnapshot: `${actor.firstName} ${actor.lastName}`, operation: "PHYSICAL_VERIFICATION_FLAGGED", entityType: "PhysicalVerificationFlag", entityId: created.id, sessionId: actor.sessionId, payload: { weaponRegistryRef: weapon.registryRef, reason: input.reason } }); return created; }); return Response.json({ flag }, { status: 201 }); } catch (error) { return errorResponse(error); }
}
export async function PATCH(request: Request) {
  try { await assertSameOrigin(request); const actor = await requireApiUser(); const input = resolveSchema.parse(await request.json()); const flag = await prisma.physicalVerificationFlag.findUnique({ where: { id: input.id } }); if (!flag || flag.resolvedAt) throw new DomainError("Flaga nie istnieje albo jest już zamknięta.", "FLAG_NOT_OPEN"); await prisma.$transaction(async (tx) => { await tx.physicalVerificationFlag.update({ where: { id: flag.id }, data: { resolvedAt: new Date(), resolvedById: actor.id, resolvedByName: `${actor.firstName} ${actor.lastName}` } }); if (flag.weaponId) await tx.weaponEvent.create({ data: { weaponId: flag.weaponId, type: "FLAG_RESOLVED", effectiveAt: new Date(), snapshot: { flagId: flag.id }, performedById: actor.id, performedByName: `${actor.firstName} ${actor.lastName}` } }); await appendAudit(tx, { userId: actor.id, userSnapshot: `${actor.firstName} ${actor.lastName}`, operation: "PHYSICAL_VERIFICATION_RESOLVED", entityType: "PhysicalVerificationFlag", entityId: flag.id, sessionId: actor.sessionId, payload: { entityType: flag.entityType, entityId: flag.entityId } }); }); return Response.json({ ok: true }); } catch (error) { return errorResponse(error); }
}
