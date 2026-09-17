import Database from "better-sqlite3";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync } from "node:fs";
import { dirname, isAbsolute, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(process.cwd());

export function resolveDatabasePath(databaseUrl = process.env.DATABASE_URL ?? "file:../data/database.sqlite") {
  if (!databaseUrl.startsWith("file:")) throw new Error("PMBP — Polski Magazyn Broni Palnej obsługuje lokalny URL SQLite zaczynający się od file:.");
  const rawPath = decodeURIComponent(databaseUrl.slice(5));
  return isAbsolute(rawPath) ? rawPath : resolve(root, "prisma", rawPath);
}

export function runMigrations(databasePath = resolveDatabasePath()) {
  mkdirSync(dirname(databasePath), { recursive: true });
  const db = new Database(databasePath);
  db.pragma("foreign_keys = ON");
  db.pragma("journal_mode = WAL");
  db.exec(`CREATE TABLE IF NOT EXISTS _pmb_migrations (
    name TEXT PRIMARY KEY,
    checksum TEXT NOT NULL,
    applied_at TEXT NOT NULL
  )`);
  const applied = new Map((db.prepare("SELECT name, checksum FROM _pmb_migrations").all() as { name: string; checksum: string }[]).map((row) => [row.name, row.checksum]));
  const migrationsRoot = resolve(root, "prisma/migrations");
  const migrations = existsSync(migrationsRoot)
    ? readdirSync(migrationsRoot, { withFileTypes: true }).filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort()
    : [];
  for (const name of migrations) {
    const file = resolve(migrationsRoot, name, "migration.sql");
    if (!existsSync(file)) continue;
    const sql = readFileSync(file, "utf8");
    const checksum = createHash("sha256").update(sql).digest("hex");
    if (applied.has(name)) {
      if (applied.get(name) !== checksum) throw new Error(`Migracja ${name} została zmieniona po zastosowaniu. Przywróć jej pierwotną treść.`);
      continue;
    }
    const apply = db.transaction(() => {
      db.exec(sql);
      db.prepare("INSERT INTO _pmb_migrations (name, checksum, applied_at) VALUES (?, ?, ?)").run(name, checksum, new Date().toISOString());
    });
    apply();
    console.log(`Zastosowano migrację ${name}.`);
  }
  db.pragma("optimize");
  const integrity = db.pragma("integrity_check", { simple: true });
  const foreignKeys = db.pragma("foreign_key_check") as unknown[];
  db.close();
  if (integrity !== "ok") throw new Error(`Kontrola integralności SQLite nie powiodła się: ${integrity}`);
  if (foreignKeys.length) throw new Error(`Kontrola kluczy obcych SQLite wykryła ${foreignKeys.length} nieprawidłowych odwołań.`);
  return migrations.length;
}

if (fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const count = runMigrations();
  console.log(`Baza danych jest aktualna (${count} migracji).`);
}
