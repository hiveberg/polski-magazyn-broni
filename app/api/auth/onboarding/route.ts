import { hash } from "@node-rs/argon2";
import { prisma } from "@/lib/db";
import { appendAudit } from "@/lib/domain/audit";
import { destroySession, requireApiUser } from "@/lib/auth/session";
import { assertSameOrigin } from "@/lib/auth/security";
import { errorResponse, DomainError } from "@/lib/errors";
import { onboardingSchema } from "@/lib/validation/schemas";

export async function POST(request: Request) {
  try {
    await assertSameOrigin(request);
    const bootstrap = await requireApiUser({ allowBootstrap: true, allowPasswordChange: true });
    if (!bootstrap.isBootstrap) throw new DomainError("Konfiguracja startowa została już zakończona.", "ONBOARDING_COMPLETE");
    const input = onboardingSchema.parse(await request.json());
    const passwordHash = await hash(input.temporaryPassword, { memoryCost: 19456, timeCost: 2, parallelism: 1 });
    await prisma.$transaction(async (tx) => {
      const existingAdmins = await tx.user.count({ where: { isBootstrap: false, role: "ADMIN" } });
      if (existingAdmins > 0) throw new DomainError("Właściwy administrator już istnieje.", "ADMIN_EXISTS");
      const admin = await tx.user.create({ data: { firstName: input.firstName, lastName: input.lastName, login: input.login, passwordHash, role: "ADMIN", active: true, isAuthorized: true, forcePasswordChange: true } });
      await tx.user.update({ where: { id: bootstrap.id }, data: { active: false } });
      await tx.session.deleteMany({ where: { userId: bootstrap.id } });
      await appendAudit(tx, { userId: bootstrap.id, userSnapshot: "Administrator Bootstrap", operation: "INITIAL_ADMIN_CREATED", entityType: "User", entityId: admin.id, sessionId: bootstrap.sessionId, payload: { login: admin.login, firstName: admin.firstName, lastName: admin.lastName } });
    });
    await destroySession();
    return Response.json({ ok: true, redirect: "/login?onboarding=complete" });
  } catch (error) { return errorResponse(error); }
}
