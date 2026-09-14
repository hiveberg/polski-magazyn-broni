import { hash } from "@node-rs/argon2";
import { prisma } from "@/lib/db";
import { appendAudit } from "@/lib/domain/audit";
import { requireApiUser } from "@/lib/auth/session";
import { assertSameOrigin } from "@/lib/auth/security";
import { errorResponse, DomainError } from "@/lib/errors";
import { changePasswordSchema, pinSchema } from "@/lib/validation/schemas";

export async function POST(request: Request) {
  try {
    await assertSameOrigin(request);
    const actor = await requireApiUser({ allowPasswordChange: true });
    const body = await request.json();
    const input = changePasswordSchema.parse(body);
    const current = await prisma.user.findUnique({ where: { id: actor.id } });
    if (!current) throw new DomainError("Nie znaleziono użytkownika.", "USER_NOT_FOUND", 404);
    const pin = current.pinHash ? undefined : pinSchema.parse(body.pin);
    const [passwordHash, pinHash] = await Promise.all([hash(input.password, { memoryCost: 19456, timeCost: 2, parallelism: 1 }), pin ? hash(pin, { memoryCost: 19456, timeCost: 2, parallelism: 1 }) : Promise.resolve(undefined)]);
    await prisma.$transaction(async (tx) => {
      await tx.user.update({ where: { id: actor.id }, data: { passwordHash, pinHash, forcePasswordChange: false } });
      await appendAudit(tx, { userId: actor.id, userSnapshot: `${actor.firstName} ${actor.lastName}`, operation: "PASSWORD_CHANGED", entityType: "User", entityId: actor.id, sessionId: actor.sessionId, payload: { pinConfigured: Boolean(pinHash) } });
    });
    return Response.json({ ok: true, redirect: "/dashboard" });
  } catch (error) { return errorResponse(error); }
}
