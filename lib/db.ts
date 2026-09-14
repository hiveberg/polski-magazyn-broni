import { PrismaClient } from "@prisma/client";

process.env.DATABASE_URL ??= "file:../data/database.sqlite";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"] });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

let initialized = false;
export async function prepareDatabase() {
  if (initialized) return;
  await prisma.$queryRawUnsafe("PRAGMA foreign_keys = ON");
  await prisma.$queryRawUnsafe("PRAGMA journal_mode = WAL");
  await prisma.$queryRawUnsafe("PRAGMA busy_timeout = 5000");
  initialized = true;
}
