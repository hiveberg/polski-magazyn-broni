import { dirname, isAbsolute, resolve, sep } from "node:path";
import { mkdir } from "node:fs/promises";

const root = process.cwd();
export const dataPath = resolve(root, "data");
export const uploadsPath = resolve(dataPath, "uploads");
export const backupsPath = resolve(dataPath, "backups");
export const logsPath = resolve(dataPath, "logs");

export function databasePath() {
  const url = process.env.DATABASE_URL ?? "file:../data/database.sqlite";
  if (!url.startsWith("file:")) throw new Error("Wymagany jest lokalny URL SQLite file:.");
  const raw = decodeURIComponent(url.slice(5));
  return isAbsolute(raw) ? raw : resolve(root, "prisma", raw);
}

export function safeChild(base: string, relative: string) {
  const target = resolve(base, relative);
  if (target !== base && !target.startsWith(base + sep)) throw new Error("Niedozwolona ścieżka pliku.");
  return target;
}

export async function ensureDataDirectories() {
  await Promise.all([dirname(databasePath()), uploadsPath, backupsPath, logsPath].map((path) => mkdir(path, { recursive: true })));
}
