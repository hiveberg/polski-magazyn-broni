import { hash, verify } from "@node-rs/argon2";
import { prisma } from "@/lib/db";
import { createSession } from "@/lib/auth/session";
import { assertSameOrigin } from "@/lib/auth/security";
import { errorResponse, DomainError } from "@/lib/errors";
import { loginSchema } from "@/lib/validation/schemas";

const WINDOW_MS = 15 * 60 * 1000;

export async function POST(request: Request) {
  try {
    await assertSameOrigin(request);
    const input = loginSchema.parse(await request.json());
    const recentFailures = await prisma.securityEvent.count({ where: { login: input.login, type: "LOGIN_FAILED", timestamp: { gte: new Date(Date.now() - WINDOW_MS) } } });
    if (recentFailures >= 5) throw new DomainError("Zbyt wiele prób logowania. Spróbuj ponownie za 15 minut.", "LOGIN_LOCKED", 429);
    const user = await prisma.user.findUnique({ where: { login: input.login } });
    const valid = user?.active ? await verify(user.passwordHash, input.password).catch(() => false) : await hash(input.password, { memoryCost: 19456, timeCost: 2, parallelism: 1 }).then(() => false);
    if (!user || !valid) {
      await prisma.securityEvent.create({ data: { userId: user?.id, login: input.login, type: "LOGIN_FAILED", success: false } });
      throw new DomainError("Nieprawidłowy login lub hasło.", "INVALID_CREDENTIALS", 401);
    }
    await prisma.$transaction([prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } }), prisma.securityEvent.create({ data: { userId: user.id, login: user.login, type: "LOGIN_SUCCESS", success: true } })]);
    await createSession(user.id);
    return Response.json({ ok: true, redirect: user.isBootstrap ? "/onboarding" : user.forcePasswordChange ? "/change-password" : "/dashboard" });
  } catch (error) { return errorResponse(error); }
}
