import AdmZip from "adm-zip";
import { hash } from "@node-rs/argon2";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { rm } from "node:fs/promises";
import { resolve } from "node:path";
import { runMigrations } from "@/scripts/migrate";
import { prisma } from "@/lib/db";
import { assertAccountAccess, type CurrentUser } from "@/lib/auth/session";
import { confirmPin } from "@/lib/auth/pin";
import { createBackup } from "@/lib/backup";
import { verifyAuditChain } from "@/lib/domain/audit";
import { registryRef } from "@/lib/domain/registers";
import { acquireAmmunition, addWeapon, createCorrection, issueAmmunition, issueWeapon, returnAmmunition, returnWeapon, withdrawWeapon } from "@/lib/domain/business";
import caliberPreset from "@/data/calibers.modern.json";

const database = resolve(process.cwd(), "tmp/vitest-database.sqlite");
const pinOptions = { memoryCost: 19456, timeCost: 2, parallelism: 1 };

let actor: CurrentUser;
let books: Record<"weapon" | "ammo" | "weaponIssue" | "ammoIssue", { id: string }>;
let caliberId: string;
let documentId: string;
let weaponId: string;

beforeAll(async () => {
  runMigrations(database);
  const user = await prisma.user.create({ data: {
    firstName: "Anna", lastName: "Testowa", login: "anna.testowa",
    passwordHash: await hash("BezpieczneHaslo123", pinOptions), pinHash: await hash("1234", pinOptions),
    role: "ADMIN", active: true, isAuthorized: true, forcePasswordChange: false,
  } });
  actor = { ...user, sessionId: "vitest-session" };
  const [weapon, ammo, weaponIssue, ammoIssue] = await Promise.all([
    prisma.registerBook.create({ data: { type: "WEAPON", series: "A", name: "Broń testowa" } }),
    prisma.registerBook.create({ data: { type: "AMMUNITION", series: "C", name: "Amunicja testowa" } }),
    prisma.registerBook.create({ data: { type: "WEAPON_ISSUE", series: "WB", name: "Wydania broni" } }),
    prisma.registerBook.create({ data: { type: "AMMUNITION_ISSUE", series: "WA", name: "Wydania amunicji" } }),
  ]);
  books = { weapon, ammo, weaponIssue, ammoIssue };
  const caliber = await prisma.caliber.create({ data: { canonicalName: "9×19 mm Parabellum", source: "test" } });
  caliberId = caliber.id;
  const document = await prisma.document.create({ data: { type: "INVOICE", number: "TEST/1", documentDate: new Date("2026-09-14T08:00:00Z"), description: "Zakup testowy", createdById: user.id, createdByName: "Anna Testowa" } });
  documentId = document.id;
});

afterAll(async () => {
  await prisma.$disconnect();
  for (const path of [database, `${database}-wal`, `${database}-shm`]) await rm(path, { force: true });
});

describe("reguły domenowe magazynu", () => {
  test("preset kalibrów jest bogaty w aliasy i pomija bardzo historyczne naboje", () => {
    const names = new Set(caliberPreset.calibers.map((caliber) => caliber.canonicalName));
    const nine = caliberPreset.calibers.find((caliber) => caliber.canonicalName === "9×19 mm Parabellum");
    expect(caliberPreset.calibers.length).toBeGreaterThanOrEqual(100);
    expect(caliberPreset.calibers.reduce((total, caliber) => total + caliber.aliases.length, 0)).toBeGreaterThanOrEqual(300);
    expect(nine?.aliases).toEqual(expect.arrayContaining(["9mm", "9x19", "9 mm Luger", "9 Para"]));
    expect(names.has("30-40 Krag")).toBe(false);
    expect(names.has("8 mm Gasser")).toBe(false);
  });

  test("numery pozycji mają niezmienny prefiks księgi", () => {
    expect(registryRef("A", 12)).toBe("A12");
    expect(registryRef("ZZ", 4)).toBe("ZZ4");
  });

  test("kontrola dostępu rozróżnia administratora i osobę upoważnioną", () => {
    expect(() => assertAccountAccess(actor, { admin: true })).not.toThrow();
    expect(() => assertAccountAccess({ ...actor, role: "AUTHORIZED" }, { admin: true })).toThrowError(expect.objectContaining({ code: "FORBIDDEN" }));
    expect(() => assertAccountAccess({ ...actor, role: "AUTHORIZED", isAuthorized: false })).toThrowError(expect.objectContaining({ code: "NOT_AUTHORIZED" }));
  });

  test("nabycie tworzy broń, wpis źródłowy i kolejną pozycję", async () => {
    const weapon = await addWeapon({
      bookId: books.weapon.id, caliberId, documentId, name: "Pistolet testowy", brand: "PMB",
      productionYear: 2026, serialNumber: "PMB-0001", type: "HANDGUN", acquisitionBasis: "Faktura TEST/1",
      acquisitionDate: new Date("2026-09-14T08:00:00Z"), registeredAt: new Date("2026-09-14T09:00:00Z"), pin: "1234",
    }, actor);
    weaponId = weapon.id;
    expect(weapon.registryRef).toBe("A1");
    expect(await prisma.weaponRegisterEntry.count({ where: { weaponId } })).toBe(1);
    expect((await prisma.registerBook.findUniqueOrThrow({ where: { id: books.weapon.id } })).nextPosition).toBe(2);
  });

  test("przychód amunicji buduje saldo księgi", async () => {
    const entry = await acquireAmmunition({
      bookId: books.ammo.id, caliberId, documentId, ammunitionType: "pełnopłaszczowa", quantity: 100,
      basis: "Faktura TEST/1", effectiveAt: new Date("2026-09-14T09:05:00Z"), pin: "1234",
    }, actor);
    expect(entry.registryRef).toBe("C1");
    expect(entry.balanceAfter).toBe(100);
  });

  test("nieudane wydanie z nadmierną amunicją cofa całą transakcję", async () => {
    await expect(issueWeapon({
      weaponId, bookId: books.weaponIssue.id, recipientName: "Jan Odbiorca", recipientReference: "LEG-1",
      magazineCount: 2, pin: "1234", ammo: { issueBookId: books.ammoIssue.id, sourceBookId: books.ammo.id, quantity: 120, ammunitionType: "pełnopłaszczowa" },
    }, actor)).rejects.toMatchObject({ code: "INSUFFICIENT_AMMO" });
    expect((await prisma.weapon.findUniqueOrThrow({ where: { id: weaponId } })).status).toBe("IN_STORAGE");
    expect(await prisma.weaponIssue.count()).toBe(0);
    expect((await prisma.registerBook.findUniqueOrThrow({ where: { id: books.weaponIssue.id } })).nextPosition).toBe(1);
  });

  test("wydanie i zwrot broni wiążą amunicję oraz liczą rozchód", async () => {
    const issued = await issueWeapon({
      weaponId, bookId: books.weaponIssue.id, recipientName: "Jan Odbiorca", recipientReference: "LEG-1",
      magazineCount: 2, pin: "1234", ammo: { issueBookId: books.ammoIssue.id, sourceBookId: books.ammo.id, quantity: 40, ammunitionType: "pełnopłaszczowa" },
    }, actor);
    expect(issued.issue.registryRef).toBe("WB1");
    expect((await prisma.weapon.findUniqueOrThrow({ where: { id: weaponId } })).status).toBe("ISSUED");
    await expect(issueWeapon({ weaponId, bookId: books.weaponIssue.id, recipientName: "Drugi Odbiorca", magazineCount: 0, pin: "1234" }, actor)).rejects.toMatchObject({ code: "WEAPON_NOT_AVAILABLE" });
    await returnWeapon({ issueId: issued.issue.id, returnedFromName: "Jan Odbiorca", returnedAmmoQuantity: 15, pin: "1234" }, actor);
    const ammoIssue = await prisma.ammoIssue.findFirstOrThrow({ where: { weaponIssueId: issued.issue.id } });
    expect(ammoIssue).toMatchObject({ status: "CLOSED", quantityReturned: 15, quantityConsumed: 25 });
    expect((await prisma.weapon.findUniqueOrThrow({ where: { id: weaponId } })).status).toBe("IN_STORAGE");
    const totals = await prisma.ammunitionRegisterEntry.aggregate({ _sum: { quantityIn: true, quantityOut: true } });
    expect((totals._sum.quantityIn ?? 0) - (totals._sum.quantityOut ?? 0)).toBe(75);
  });

  test("broń po zwrocie można wydać ponownie, a po wycofaniu już nie", async () => {
    const second = await issueWeapon({ weaponId, bookId: books.weaponIssue.id, recipientName: "Drugi Odbiorca", magazineCount: 1, pin: "1234" }, actor);
    await returnWeapon({ issueId: second.issue.id, returnedFromName: "Drugi Odbiorca", pin: "1234" }, actor);
    await withdrawWeapon({ weaponId, documentId, basis: "Protokół wycofania TEST/1", status: "WITHDRAWN", pin: "1234" }, actor);
    expect((await prisma.weapon.findUniqueOrThrow({ where: { id: weaponId } })).status).toBe("WITHDRAWN");
    await expect(issueWeapon({ weaponId, bookId: books.weaponIssue.id, recipientName: "Trzeci Odbiorca", magazineCount: 0, pin: "1234" }, actor)).rejects.toMatchObject({ code: "WEAPON_NOT_AVAILABLE" });
    await expect(withdrawWeapon({ weaponId, documentId, basis: "Powtórzenie", status: "WITHDRAWN", pin: "1234" }, actor)).rejects.toMatchObject({ code: "WEAPON_NOT_WITHDRAWABLE" });
  });

  test("samodzielne wydanie i zwrot amunicji nie pozwalają zejść poniżej zera", async () => {
    const issue = await issueAmmunition({ bookId: books.ammoIssue.id, sourceBookId: books.ammo.id, caliberId, ammunitionType: "pełnopłaszczowa", quantity: 20, recipientName: "Sekcja sportowa", pin: "1234" }, actor);
    const closed = await returnAmmunition({ issueId: issue.id, returnedQuantity: 5, pin: "1234" }, actor);
    expect(closed.consumed).toBe(15);
    const before = await prisma.ammunitionRegisterEntry.aggregate({ _sum: { quantityIn: true, quantityOut: true } });
    await expect(issueAmmunition({ bookId: books.ammoIssue.id, sourceBookId: books.ammo.id, caliberId, ammunitionType: "pełnopłaszczowa", quantity: 1000, recipientName: "Sekcja sportowa", pin: "1234" }, actor)).rejects.toMatchObject({ code: "INSUFFICIENT_AMMO" });
    const after = await prisma.ammunitionRegisterEntry.aggregate({ _sum: { quantityIn: true, quantityOut: true } });
    expect(after).toEqual(before);
  });

  test("korekta dopisuje zdarzenie i nie nadpisuje wpisu źródłowego", async () => {
    const original = await prisma.ammunitionRegisterEntry.findFirstOrThrow({ orderBy: { positionNo: "asc" } });
    await createCorrection({ entityType: "AmmunitionRegisterEntry", entryId: original.id, correctedValues: { basis: "Faktura TEST/1 — poprawiono opis" }, reason: "Oczywista omyłka pisarska", pin: "1234" }, actor);
    expect((await prisma.ammunitionRegisterEntry.findUniqueOrThrow({ where: { id: original.id } })).basis).toBe(original.basis);
    expect(await prisma.correctionEvent.count({ where: { correctsAmmoEntryId: original.id } })).toBe(1);
  });

  test("PIN blokuje się po pięciu błędnych próbach", async () => {
    for (let attempt = 1; attempt <= 5; attempt += 1) await expect(confirmPin(actor.id, "9999")).rejects.toMatchObject({ code: attempt === 5 ? "PIN_LOCKED" : "INVALID_PIN" });
    await expect(confirmPin(actor.id, "1234")).rejects.toMatchObject({ code: "PIN_LOCKED" });
    await prisma.user.update({ where: { id: actor.id }, data: { pinFailedAttempts: 0, pinLockedUntil: null } });
  });

  test("backup zawiera spójny manifest, bazę i sumy kontrolne", async () => {
    const result = await createBackup("MANUAL", actor);
    try {
      const zip = new AdmZip(result.path);
      const manifest = JSON.parse(zip.readAsText("manifest.json"));
      expect(manifest).toMatchObject({ format: "pmb-backup", version: 1, schemaVersion: "20260914010000_init" });
      expect(zip.getEntry("database.sqlite")).toBeTruthy();
      expect(manifest.hashes["database.sqlite"]).toMatch(/^[a-f0-9]{64}$/);
    } finally {
      await rm(result.path, { force: true });
    }
  });

  test("łańcuch audytu wykrywa zmianę historycznego wpisu", async () => {
    expect(await verifyAuditChain()).toMatchObject({ valid: true });
    const first = await prisma.auditEvent.findFirstOrThrow({ orderBy: { sequence: "asc" } });
    await prisma.auditEvent.update({ where: { id: first.id }, data: { payload: { tampered: true } } });
    expect(await verifyAuditChain()).toMatchObject({ valid: false, brokenAt: first.sequence });
  });
});
