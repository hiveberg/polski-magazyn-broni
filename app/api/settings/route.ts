import { z } from "zod";
import { prisma } from "@/lib/db";
import { appendAudit } from "@/lib/domain/audit";
import { requireApiUser } from "@/lib/auth/session";
import { assertSameOrigin } from "@/lib/auth/security";
import { errorResponse } from "@/lib/errors";

const schema = z.object({ showInactiveWeaponsInGrid: z.boolean(), backupHour: z.number().int().min(0).max(23), backupMinute: z.number().int().min(0).max(59) });
export async function POST(request: Request) {
  try { await assertSameOrigin(request); const actor = await requireApiUser({ admin: true }); const input = schema.parse(await request.json()); await prisma.$transaction(async (tx) => { await tx.systemSetting.upsert({ where: { key: "showInactiveWeaponsInGrid" }, update: { value: input.showInactiveWeaponsInGrid, updatedById: actor.id }, create: { key: "showInactiveWeaponsInGrid", value: input.showInactiveWeaponsInGrid, updatedById: actor.id } }); await tx.systemSetting.upsert({ where: { key: "backupSchedule" }, update: { value: { enabled: true, hour: input.backupHour, minute: input.backupMinute }, updatedById: actor.id }, create: { key: "backupSchedule", value: { enabled: true, hour: input.backupHour, minute: input.backupMinute }, updatedById: actor.id } }); await appendAudit(tx, { userId: actor.id, userSnapshot: `${actor.firstName} ${actor.lastName}`, operation: "SETTINGS_UPDATED", entityType: "SystemSetting", sessionId: actor.sessionId, payload: input }); }); return Response.json({ ok: true }); }
  catch (error) { return errorResponse(error); }
}
