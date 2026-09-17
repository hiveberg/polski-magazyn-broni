import AdmZip from "adm-zip";
import Database from "better-sqlite3";
import { copyFile, mkdir, readFile, readdir, rename, rm, stat, writeFile } from "node:fs/promises";
import { basename, dirname, join, relative } from "node:path";
import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/db";
import { appendAudit, sha256, verifyAuditChain } from "@/lib/domain/audit";
import { backupsPath, databasePath, ensureDataDirectories, safeChild, uploadsPath } from "@/lib/paths";
import { DomainError } from "@/lib/errors";
import type { CurrentUser } from "@/lib/auth/session";

const APP_VERSION = "1.0.0";
const SCHEMA_VERSION = "20260917120000_navigation_recipients_and_corrections";

async function listFiles(base: string, dir = base): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true }).catch(() => []);
  const files: string[] = [];
  for (const entry of entries) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) files.push(...await listFiles(base, path));
    else if (entry.isFile()) files.push(relative(base, path));
  }
  return files;
}

function dateStamp(date = new Date()) {
  return date.toISOString().replace(/[-:]/g, "").replace("T", "-").slice(0, 15);
}

export async function createBackup(type: "AUTO" | "MANUAL" | "PRE_RESTORE", actor?: CurrentUser) {
  await ensureDataDirectories();
  const filename = `pmb-backup-${dateStamp()}-${randomUUID().slice(0, 8)}.zip`;
  const finalPath = safeChild(backupsPath, filename);
  const workDir = safeChild(backupsPath, `.building-${randomUUID()}`);
  const snapshotPath = join(workDir, "database.sqlite");
  await mkdir(workDir, { recursive: true });
  const record = await prisma.backupRecord.create({ data: { type, filename, logicalPath: filename, status: "PENDING", appVersion: APP_VERSION, schemaVersion: SCHEMA_VERSION, initiatedById: actor?.id, initiatedByName: actor ? `${actor.firstName} ${actor.lastName}` : undefined } });
  try {
    const source = new Database(databasePath(), { readonly: true });
    await source.backup(snapshotPath);
    source.close();
    const check = new Database(snapshotPath, { readonly: true });
    const integrity = check.pragma("integrity_check", { simple: true });
    const foreignKeys = check.pragma("foreign_key_check") as unknown[];
    check.close();
    if (integrity !== "ok" || foreignKeys.length) throw new Error("Migawka SQLite nie przeszła kontroli integralności.");
    const uploadFiles = await listFiles(uploadsPath);
    const fileHashes: Record<string, string> = { "database.sqlite": sha256(await readFile(snapshotPath)) };
    for (const file of uploadFiles) fileHashes[`uploads/${file}`] = sha256(await readFile(safeChild(uploadsPath, file)));
    const [audit, users, weapons, ammoEntries, weaponIssues, ammoIssues, ammoAllocations, documents, attachments, weaponImages, recipients, systemSettings] = await Promise.all([verifyAuditChain(), prisma.user.count(), prisma.weapon.count(), prisma.ammunitionRegisterEntry.count(), prisma.weaponIssue.count(), prisma.ammoIssue.count(), prisma.ammoIssueAllocation.count(), prisma.document.count(), prisma.attachment.count(), prisma.weaponImage.count(), prisma.recipient.count(), prisma.systemSetting.count()]);
    if (!audit.valid) throw new Error(`Łańcuch audytu jest niespójny od wpisu ${audit.brokenAt}.`);
    const manifest = { format: "pmb-backup", version: 1, appVersion: APP_VERSION, schemaVersion: SCHEMA_VERSION, createdAt: new Date().toISOString(), backupType: type, hashes: fileHashes, counts: { users, weapons, ammoEntries, weaponIssues, ammoIssues, ammoAllocations, documents, attachments, weaponImages, recipients, systemSettings }, auditHeadHash: audit.headHash };
    const zip = new AdmZip();
    zip.addLocalFile(snapshotPath, "", "database.sqlite");
    for (const file of uploadFiles) zip.addLocalFile(safeChild(uploadsPath, file), `uploads/${dirname(file) === "." ? "" : dirname(file)}`);
    zip.addFile("manifest.json", Buffer.from(JSON.stringify(manifest, null, 2) + "\n"));
    await new Promise<void>((resolveWrite, reject) => zip.writeZip(finalPath, (error) => error ? reject(error) : resolveWrite()));
    const validation = new AdmZip(finalPath);
    const names = new Set(validation.getEntries().map((entry) => entry.entryName));
    if (!names.has("manifest.json") || !names.has("database.sqlite")) throw new Error("Pakiet backupu nie zawiera wymaganych plików.");
    for (const [name, hash] of Object.entries(fileHashes)) {
      const entry = validation.getEntry(name);
      if (!entry || sha256(entry.getData()) !== hash) throw new Error(`Nieprawidłowa suma kontrolna pliku ${name}.`);
    }
    const zipHash = sha256(await readFile(finalPath));
    await prisma.$transaction(async (tx) => {
      await tx.backupRecord.update({ where: { id: record.id }, data: { status: "SUCCESS", sha256: zipHash, auditHeadHash: audit.headHash, recordCounts: manifest.counts, completedAt: new Date() } });
      await appendAudit(tx, { userId: actor?.id, userSnapshot: actor ? `${actor.firstName} ${actor.lastName}` : "SYSTEM", operation: "BACKUP_CREATED", entityType: "BackupRecord", entityId: record.id, payload: { filename, type, sha256: zipHash, counts: manifest.counts } });
    });
    return { id: record.id, filename, path: finalPath, sha256: zipHash, manifest };
  } catch (error) {
    await prisma.backupRecord.update({ where: { id: record.id }, data: { status: "FAILED", errorMessage: error instanceof Error ? error.message.slice(0, 1000) : "Nieznany błąd", completedAt: new Date() } }).catch(() => undefined);
    await rm(finalPath, { force: true }).catch(() => undefined);
    throw error;
  } finally {
    await rm(workDir, { recursive: true, force: true });
  }
}

export async function restoreBackup(buffer: Buffer, actor: CurrentUser) {
  if (buffer.length > 2_000_000_000) throw new DomainError("Plik backupu jest zbyt duży.", "BACKUP_TOO_LARGE");
  const zip = new AdmZip(buffer);
  const entries = zip.getEntries();
  for (const entry of entries) if (entry.entryName.startsWith("/") || entry.entryName.includes("..") || entry.entryName.includes("\\")) throw new DomainError("Backup zawiera niedozwoloną ścieżkę.", "UNSAFE_BACKUP");
  const manifestEntry = zip.getEntry("manifest.json");
  const databaseEntry = zip.getEntry("database.sqlite");
  if (!manifestEntry || !databaseEntry) throw new DomainError("To nie jest kompletny backup PMBP — Polskiego Magazynu Broni Palnej.", "INVALID_BACKUP");
  const manifest = JSON.parse(manifestEntry.getData().toString("utf8")) as { format: string; version: number; schemaVersion: string; hashes: Record<string, string> };
  if (manifest.format !== "pmb-backup" || manifest.version !== 1) throw new DomainError("Nieobsługiwany format backupu.", "UNSUPPORTED_BACKUP");
  if (manifest.schemaVersion !== SCHEMA_VERSION) throw new DomainError(`Backup ma wersję schematu ${manifest.schemaVersion}; aplikacja wymaga ${SCHEMA_VERSION}.`, "SCHEMA_MISMATCH");
  for (const [name, hash] of Object.entries(manifest.hashes)) {
    const entry = zip.getEntry(name);
    if (!entry || sha256(entry.getData()) !== hash) throw new DomainError(`Suma kontrolna ${name} jest nieprawidłowa.`, "BACKUP_HASH_MISMATCH");
  }
  await ensureDataDirectories();
  const workDir = safeChild(backupsPath, `.restore-${randomUUID()}`);
  await mkdir(workDir, { recursive: true });
  const candidateDb = join(workDir, "database.sqlite");
  await writeFile(candidateDb, databaseEntry.getData());
  const candidate = new Database(candidateDb, { readonly: true });
  const integrity = candidate.pragma("integrity_check", { simple: true });
  const foreignKeys = candidate.pragma("foreign_key_check") as unknown[];
  candidate.close();
  if (integrity !== "ok" || foreignKeys.length) throw new DomainError("Baza w backupie nie przeszła kontroli integralności.", "INVALID_DATABASE_BACKUP");
  await createBackup("PRE_RESTORE", actor);
  const liveDb = databasePath();
  const rollbackDb = `${liveDb}.restore-rollback`;
  const stagedUploads = join(workDir, "uploads");
  await mkdir(stagedUploads, { recursive: true });
  for (const entry of entries.filter((item) => item.entryName.startsWith("uploads/") && !item.isDirectory)) {
    const rel = entry.entryName.slice("uploads/".length);
    const destination = safeChild(stagedUploads, rel);
    await mkdir(dirname(destination), { recursive: true });
    await writeFile(destination, entry.getData());
  }
  await prisma.$disconnect();
  const checkpoint = new Database(liveDb);
  checkpoint.pragma("wal_checkpoint(TRUNCATE)");
  checkpoint.close();
  await Promise.all([rm(`${liveDb}-wal`, { force: true }), rm(`${liveDb}-shm`, { force: true })]);
  let databaseSwapped = false;
  let uploadsSwapped = false;
  const oldUploads = `${uploadsPath}.restore-rollback`;
  try {
    await rm(rollbackDb, { force: true });
    await rename(liveDb, rollbackDb);
    databaseSwapped = true;
    await copyFile(candidateDb, liveDb);
    await rm(oldUploads, { recursive: true, force: true });
    await rename(uploadsPath, oldUploads).catch(() => undefined);
    await rename(stagedUploads, uploadsPath);
    uploadsSwapped = true;
    const verify = new Database(liveDb, { readonly: true });
    if (verify.pragma("integrity_check", { simple: true }) !== "ok") throw new Error("Kontrola po odtworzeniu nie powiodła się.");
    verify.close();
    await rm(rollbackDb, { force: true });
    await rm(oldUploads, { recursive: true, force: true });
  } catch (error) {
    if (uploadsSwapped) {
      await rm(uploadsPath, { recursive: true, force: true }).catch(() => undefined);
      await rename(oldUploads, uploadsPath).catch(() => undefined);
    }
    if (databaseSwapped) {
      await rm(liveDb, { force: true }).catch(() => undefined);
      await Promise.all([rm(`${liveDb}-wal`, { force: true }), rm(`${liveDb}-shm`, { force: true })]);
      await rename(rollbackDb, liveDb).catch(() => undefined);
    }
    throw error;
  } finally {
    await rm(workDir, { recursive: true, force: true });
  }
  return { restored: true, schemaVersion: manifest.schemaVersion };
}

export async function backupFile(id: string) {
  const record = await prisma.backupRecord.findUnique({ where: { id } });
  if (!record || record.status !== "SUCCESS") throw new DomainError("Nie znaleziono poprawnej kopii zapasowej.", "BACKUP_NOT_FOUND", 404);
  const path = safeChild(backupsPath, basename(record.filename));
  return { record, path, size: (await stat(path)).size };
}
