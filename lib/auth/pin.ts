import { verify } from "@node-rs/argon2";
import { prisma } from "@/lib/db";
import { DomainError } from "@/lib/errors";

const MAX_ATTEMPTS = 5;
const LOCK_MINUTES = 15;

export async function confirmPin(userId: string, pin: string) {
  if (!/^\d{4}$/.test(pin)) throw new DomainError("PIN musi składać się z 4 cyfr.", "INVALID_PIN");
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user?.active || !user.pinHash) throw new DomainError("Użytkownik nie ma aktywnego PIN-u.", "PIN_NOT_CONFIGURED", 403);
  if (user.pinLockedUntil && user.pinLockedUntil > new Date()) throw new DomainError(`Potwierdzanie PIN-em jest zablokowane do ${user.pinLockedUntil.toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" })}.`, "PIN_LOCKED", 429);
  const valid = await verify(user.pinHash, pin);
  if (!valid) {
    const attempts = user.pinFailedAttempts + 1;
    const lockedUntil = attempts >= MAX_ATTEMPTS ? new Date(Date.now() + LOCK_MINUTES * 60 * 1000) : null;
    await prisma.$transaction([
      prisma.user.update({ where: { id: user.id }, data: { pinFailedAttempts: attempts >= MAX_ATTEMPTS ? 0 : attempts, pinLockedUntil: lockedUntil } }),
      prisma.securityEvent.create({ data: { userId: user.id, login: user.login, type: lockedUntil ? "PIN_LOCKED" : "PIN_FAILED", success: false, details: { attempts } } }),
    ]);
    throw new DomainError(lockedUntil ? "Zbyt wiele błędnych prób. PIN zablokowano na 15 minut." : "Nieprawidłowy PIN.", lockedUntil ? "PIN_LOCKED" : "INVALID_PIN", 403);
  }
  if (user.pinFailedAttempts || user.pinLockedUntil) await prisma.user.update({ where: { id: user.id }, data: { pinFailedAttempts: 0, pinLockedUntil: null } });
  return { confirmedAt: new Date(), method: "PIN" as const };
}
