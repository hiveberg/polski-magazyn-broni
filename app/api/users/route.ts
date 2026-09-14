import { hash } from "@node-rs/argon2";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { appendAudit } from "@/lib/domain/audit";
import { requireApiUser } from "@/lib/auth/session";
import { assertSameOrigin } from "@/lib/auth/security";
import { errorResponse, DomainError } from "@/lib/errors";
import { passwordSchema, pinSchema } from "@/lib/validation/schemas";

const createSchema = z.object({ firstName: z.string().trim().min(2).max(80), lastName: z.string().trim().min(2).max(100), login: z.string().trim().min(3).max(80).regex(/^[a-zA-Z0-9._-]+$/), temporaryPassword: passwordSchema, pin: pinSchema, role: z.enum(["ADMIN", "AUTHORIZED"]), isAuthorized: z.boolean() });
const patchSchema = z.object({ id: z.string().min(1), active: z.boolean() });

export async function POST(request: Request) {
  try {
    await assertSameOrigin(request); const actor = await requireApiUser({ admin: true }); const input = createSchema.parse(await request.json());
    const [passwordHash, pinHash] = await Promise.all([hash(input.temporaryPassword, { memoryCost: 19456, timeCost: 2, parallelism: 1 }), hash(input.pin, { memoryCost: 19456, timeCost: 2, parallelism: 1 })]);
    const user = await prisma.$transaction(async (tx) => { const created = await tx.user.create({ data: { firstName: input.firstName, lastName: input.lastName, login: input.login, passwordHash, pinHash, role: input.role, isAuthorized: input.isAuthorized, forcePasswordChange: true } }); await appendAudit(tx, { userId: actor.id, userSnapshot: `${actor.firstName} ${actor.lastName}`, operation: "USER_CREATED", entityType: "User", entityId: created.id, sessionId: actor.sessionId, payload: { login: created.login, role: created.role, isAuthorized: created.isAuthorized } }); return created; });
    return Response.json({ user: { ...user, passwordHash: undefined, pinHash: undefined } }, { status: 201 });
  } catch (error) { return errorResponse(error); }
}

export async function PATCH(request: Request) {
  try {
    await assertSameOrigin(request); const actor = await requireApiUser({ admin: true }); const input = patchSchema.parse(await request.json()); if (input.id === actor.id && !input.active) throw new DomainError("Nie możesz zdezaktywować własnego konta.", "CANNOT_DEACTIVATE_SELF");
    await prisma.$transaction(async (tx) => { await tx.user.update({ where: { id: input.id }, data: { active: input.active } }); if (!input.active) await tx.session.deleteMany({ where: { userId: input.id } }); await appendAudit(tx, { userId: actor.id, userSnapshot: `${actor.firstName} ${actor.lastName}`, operation: input.active ? "USER_ACTIVATED" : "USER_DEACTIVATED", entityType: "User", entityId: input.id, sessionId: actor.sessionId, payload: { active: input.active } }); });
    return Response.json({ ok: true });
  } catch (error) { return errorResponse(error); }
}
