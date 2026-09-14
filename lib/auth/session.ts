import { randomBytes } from "node:crypto";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import type { UserRole } from "@prisma/client";
import { prisma, prepareDatabase } from "@/lib/db";
import { DomainError } from "@/lib/errors";
import { tokenHash } from "./security";

export const SESSION_COOKIE = "pmb_session";
const SESSION_HOURS = 12;

export type CurrentUser = { id: string; firstName: string; lastName: string; login: string; role: UserRole; active: boolean; isAuthorized: boolean; forcePasswordChange: boolean; isBootstrap: boolean; sessionId: string };

export function assertAccountAccess(user: CurrentUser, options: { admin?: boolean } = {}) {
  if (!user.active) throw new DomainError("Konto jest nieaktywne.", "UNAUTHENTICATED", 401);
  if (options.admin && user.role !== "ADMIN") throw new DomainError("Ta operacja wymaga roli administratora.", "FORBIDDEN", 403);
  if (!user.isBootstrap && !user.isAuthorized && user.role !== "ADMIN") throw new DomainError("Konto nie posiada aktywnego upoważnienia.", "NOT_AUTHORIZED", 403);
}

export async function createSession(userId: string) {
  await prepareDatabase();
  const token = randomBytes(32).toString("base64url");
  const values = await headers();
  const session = await prisma.session.create({ data: { userId, tokenHash: tokenHash(token), expiresAt: new Date(Date.now() + SESSION_HOURS * 60 * 60 * 1000), userAgent: values.get("user-agent")?.slice(0, 300) } });
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, { httpOnly: true, sameSite: "strict", secure: process.env.NODE_ENV === "production", path: "/", expires: session.expiresAt });
  return session;
}

export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) await prisma.session.deleteMany({ where: { tokenHash: tokenHash(token) } });
  jar.set(SESSION_COOKIE, "", { httpOnly: true, sameSite: "strict", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 0 });
}

export async function currentUser(): Promise<CurrentUser | null> {
  await prepareDatabase();
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const session = await prisma.session.findUnique({ where: { tokenHash: tokenHash(token) }, include: { user: true } });
  if (!session || session.expiresAt <= new Date() || !session.user.active) return null;
  return { id: session.user.id, firstName: session.user.firstName, lastName: session.user.lastName, login: session.user.login, role: session.user.role, active: session.user.active, isAuthorized: session.user.isAuthorized, forcePasswordChange: session.user.forcePasswordChange, isBootstrap: session.user.isBootstrap, sessionId: session.id };
}

export async function requireUser(options: { admin?: boolean; allowBootstrap?: boolean; allowPasswordChange?: boolean } = {}) {
  const user = await currentUser();
  if (!user) redirect("/login");
  if (user.isBootstrap && !options.allowBootstrap) redirect("/onboarding");
  if (user.forcePasswordChange && !user.isBootstrap && !options.allowPasswordChange) redirect("/change-password");
  assertAccountAccess(user, options);
  return user;
}

export async function requireApiUser(options: { admin?: boolean; allowBootstrap?: boolean; allowPasswordChange?: boolean } = {}) {
  const user = await currentUser();
  if (!user) throw new DomainError("Sesja wygasła. Zaloguj się ponownie.", "UNAUTHENTICATED", 401);
  if (user.isBootstrap && !options.allowBootstrap) throw new DomainError("Najpierw dokończ konfigurację administratora.", "ONBOARDING_REQUIRED", 403);
  if (user.forcePasswordChange && !user.isBootstrap && !options.allowPasswordChange) throw new DomainError("Najpierw ustaw własne hasło.", "PASSWORD_CHANGE_REQUIRED", 403);
  assertAccountAccess(user, options);
  return user;
}
