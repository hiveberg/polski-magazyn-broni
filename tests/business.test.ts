import AdmZip from "adm-zip";
import { hash } from "@node-rs/argon2";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { runMigrations } from "@/scripts/migrate";
import { prisma } from "@/lib/db";
import { assertAccountAccess, type CurrentUser } from "@/lib/auth/session";
import { confirmPin } from "@/lib/auth/pin";
import { createBackup, restoreBackup } from "@/lib/backup";
import { sha256, verifyAuditChain } from "@/lib/domain/audit";
import { registryRef } from "@/lib/domain/registers";
import { acquireAmmunition, addWeapon, createCorrection, issueAmmunition, issueWeapon, returnAmmunition, returnWeapon, topUpAmmunition, withdrawWeapon } from "@/lib/domain/business";
import { deleteDocument } from "@/lib/domain/documents";
import { caliberSuggestions, searchCalibers } from "@/lib/caliber-search";
import { planAmmoAllocation } from "@/lib/ammunition-allocation";
import { ammoStockKey, getAmmoStockBalances } from "@/lib/ammunition-stock";
import { uploadsPath } from "@/lib/paths";
import { defaultDashboardActionColors, parseDashboardActionColors } from "@/lib/settings";
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
  await rm(resolve(process.cwd(), "tmp/vitest-data"), { recursive: true, force: true });
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

  test("seria księgi jest unikalna w obrębie typu, ale może powtarzać się między typami", async () => {
    const ammunitionA = await prisma.registerBook.create({ data: { type: "AMMUNITION", series: "A", name: "Amunicja A" } });
    expect(ammunitionA.series).toBe("A");
    await expect(prisma.registerBook.create({ data: { type: "WEAPON", series: "A", name: "Druga księga broni A" } })).rejects.toMatchObject({ code: "P2002" });
  });

  test("wyszukiwarka kalibrów rozpoznaje nazwę i alias, a sugestie preferują historię oraz popularność", () => {
    const calibers = [
      { id: "nine", canonicalName: "9×19 mm Parabellum", aliases: [{ alias: "9 mm Luger" }, { alias: "9x19" }], usageCount: 7 },
      { id: "lr", canonicalName: ".22 Long Rifle", aliases: [{ alias: "22 LR" }], usageCount: 12 },
      { id: "acp", canonicalName: ".45 ACP", aliases: [{ alias: "45 Auto" }], usageCount: 4 },
    ];
    expect(searchCalibers(calibers, "Parabellum").map((item) => item.id)).toEqual(["nine"]);
    expect(searchCalibers(calibers, "9mm luger").map((item) => item.id)).toEqual(["nine"]);
    expect(caliberSuggestions(calibers, ["acp"]).map((item) => item.id)).toEqual(["acp", "lr", "nine"]);
  });

  test("plan rozchodu preferuje jedną wystarczającą księgę, a w razie potrzeby łączy źródła", () => {
    const stocks = [{ bookId: "A", available: 20 }, { bookId: "B", available: 50 }];
    expect(planAmmoAllocation(stocks, 30)).toMatchObject({ complete: true, allocations: [{ bookId: "B", quantity: 30 }] });
    expect(planAmmoAllocation(stocks, 70)).toMatchObject({ complete: true, allocations: [{ bookId: "B", quantity: 50 }, { bookId: "A", quantity: 20 }] });
    expect(planAmmoAllocation(stocks, 30, "A")).toMatchObject({ complete: false, available: 20, allocations: [] });
    expect(planAmmoAllocation(stocks, 30, "B")).toMatchObject({ complete: true, available: 50, allocations: [{ bookId: "B", quantity: 30 }] });
  });

  test("kontrola dostępu rozróżnia administratora i osobę upoważnioną", () => {
    expect(() => assertAccountAccess(actor, { admin: true })).not.toThrow();
    expect(() => assertAccountAccess({ ...actor, role: "AUTHORIZED" }, { admin: true })).toThrowError(expect.objectContaining({ code: "FORBIDDEN" }));
    expect(() => assertAccountAccess({ ...actor, role: "AUTHORIZED", isAuthorized: false })).toThrowError(expect.objectContaining({ code: "NOT_AUTHORIZED" }));
  });

  test("ustawienia kolorów odrzucają nieznane tokeny i zachowują komplet domyślnych akcji", () => {
    expect(parseDashboardActionColors({ issueWeapon: "red", returnWeapon: "nieznany" })).toEqual({ ...defaultDashboardActionColors, issueWeapon: "red" });
  });

  test("nabycie tworzy broń, wpis źródłowy i kolejną pozycję", async () => {
    const weapon = await addWeapon({
      bookId: books.weapon.id, caliberId, documentId, name: "Pistolet testowy", brand: "PMB",
      productionYear: 2026, serialNumber: "PMB-0001", magazineCount: 2, acquisitionBasis: "Faktura TEST/1",
      acquisitionDate: new Date("2026-09-14T08:00:00Z"), registeredAt: new Date("2026-09-14T09:00:00Z"), pin: "1234",
    }, actor);
    weaponId = weapon.id;
    expect(weapon.registryRef).toBe("A1");
    expect(weapon).toMatchObject({ type: null, magazineCount: 2 });
    expect(await prisma.weaponRegisterEntry.count({ where: { weaponId } })).toBe(1);
    expect((await prisma.registerBook.findUniqueOrThrow({ where: { id: books.weapon.id } })).nextPosition).toBe(2);
  });

  test("metadane broni są edytowalne, a wiele zdjęć można dodać i usunąć", async () => {
    await prisma.weapon.update({ where: { id: weaponId }, data: { displayName: "Pistolet klubowy nr 1" } });
    expect((await prisma.weapon.findUniqueOrThrow({ where: { id: weaponId } })).displayName).toBe("Pistolet klubowy nr 1");
    await mkdir(resolve(uploadsPath, "weapons"), { recursive: true });
    const first = Buffer.from("weapon-image-one"); const second = Buffer.from("weapon-image-two");
    await writeFile(resolve(uploadsPath, "weapons/test-one.png"), first);
    await writeFile(resolve(uploadsPath, "weapons/test-two.png"), second);
    const created = await prisma.weaponImage.createManyAndReturn({ data: [
      { weaponId, storageName: "weapons/test-one.png", originalName: "test-one.png", mimeType: "image/png", sizeBytes: first.length, sha256: sha256(first), uploadedById: actor.id },
      { weaponId, storageName: "weapons/test-two.png", originalName: "test-two.png", mimeType: "image/png", sizeBytes: second.length, sha256: sha256(second), uploadedById: actor.id },
    ] });
    expect(await prisma.weaponImage.count({ where: { weaponId } })).toBe(2);
    await prisma.weaponImage.delete({ where: { id: created[0].id } });
    await rm(resolve(uploadsPath, "weapons/test-one.png"), { force: true });
    expect(await prisma.weaponImage.findMany({ where: { weaponId }, select: { originalName: true } })).toEqual([{ originalName: "test-two.png" }]);
  });

  test("dokument obsługuje wiele załączników", async () => {
    await mkdir(resolve(uploadsPath, "documents"), { recursive: true });
    const first = Buffer.from("document-one"); const second = Buffer.from("document-two");
    await writeFile(resolve(uploadsPath, "documents/doc-one.pdf"), first);
    await writeFile(resolve(uploadsPath, "documents/doc-two.pdf"), second);
    await prisma.attachment.createMany({ data: [
      { documentId, storageName: "documents/doc-one.pdf", originalName: "doc-one.pdf", mimeType: "application/pdf", sizeBytes: first.length, sha256: sha256(first), uploadedById: actor.id },
      { documentId, storageName: "documents/doc-two.pdf", originalName: "doc-two.pdf", mimeType: "application/pdf", sizeBytes: second.length, sha256: sha256(second), uploadedById: actor.id },
    ] });
    expect(await prisma.attachment.count({ where: { documentId } })).toBe(2);
  });

  test("dokument bez referencji można usunąć wraz z plikiem, a używanego nie można", async () => {
    const deletable = await prisma.document.create({ data: { type: "OTHER", documentDate: new Date(), description: "Do usunięcia", createdById: actor.id, createdByName: "Anna Testowa" } });
    const buffer = Buffer.from("temporary-attachment"); const storageName = "documents/delete-me.pdf";
    await writeFile(resolve(uploadsPath, storageName), buffer);
    await prisma.attachment.create({ data: { documentId: deletable.id, storageName, originalName: "delete-me.pdf", mimeType: "application/pdf", sizeBytes: buffer.length, sha256: sha256(buffer), uploadedById: actor.id } });
    await deleteDocument(deletable.id, actor);
    expect(await prisma.document.findUnique({ where: { id: deletable.id } })).toBeNull();
    await expect(deleteDocument(documentId, actor)).rejects.toMatchObject({ code: "DOCUMENT_IN_USE" });
  });

  test("przychód amunicji buduje saldo księgi", async () => {
    const entry = await acquireAmmunition({
      bookId: books.ammo.id, caliberId, documentId, quantity: 100,
      basis: "Faktura TEST/1", effectiveAt: new Date("2026-09-14T09:05:00Z"), pin: "1234",
    }, actor);
    expect(entry.registryRef).toBe("C1");
    expect(entry.balanceAfter).toBe(100);
    expect(entry.ammunitionType).toBeNull();
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
    expect(issued.issue.magazineCount).toBe(2);
    expect((await prisma.weapon.findUniqueOrThrow({ where: { id: weaponId } })).status).toBe("ISSUED");
    const linkedReservation = await prisma.ammoIssueAllocation.findFirstOrThrow({ where: { issue: { weaponIssueId: issued.issue.id } } });
    expect(linkedReservation.quantity).toBe(40);
    expect(await prisma.ammunitionRegisterEntry.count({ where: { issueId: linkedReservation.issueId } })).toBe(0);
    await expect(issueWeapon({ weaponId, bookId: books.weaponIssue.id, recipientName: "Drugi Odbiorca", magazineCount: 0, pin: "1234" }, actor)).rejects.toMatchObject({ code: "WEAPON_NOT_AVAILABLE" });
    await returnWeapon({ issueId: issued.issue.id, returnedFromName: "Jan Odbiorca", returnedAmmoQuantity: 15, pin: "1234" }, actor);
    const ammoIssue = await prisma.ammoIssue.findFirstOrThrow({ where: { weaponIssueId: issued.issue.id } });
    expect(ammoIssue).toMatchObject({ status: "CLOSED", quantityReturned: 15, quantityConsumed: 25 });
    expect((await prisma.weapon.findUniqueOrThrow({ where: { id: weaponId } })).status).toBe("IN_STORAGE");
    const totals = await prisma.ammunitionRegisterEntry.aggregate({ _sum: { quantityIn: true, quantityOut: true } });
    expect((totals._sum.quantityIn ?? 0) - (totals._sum.quantityOut ?? 0)).toBe(75);
  });

  test("broń po zwrocie można wydać ponownie, a po wycofaniu już nie", async () => {
    const recipient = await prisma.recipient.create({ data: { name: "Drugi Odbiorca", reference: "DOK-22", normalizedName: "drugi odbiorca", normalizedReference: "dok22", createdById: actor.id, createdByName: "Anna Testowa" } });
    await expect(issueWeapon({ weaponId, bookId: books.weaponIssue.id, recipientName: "Drugi Odbiorca", magazineCount: 3, pin: "1234" }, actor)).rejects.toMatchObject({ code: "TOO_MANY_MAGAZINES" });
    const second = await issueWeapon({ weaponId, bookId: books.weaponIssue.id, recipientId: recipient.id, recipientName: "Nieaktualna nazwa", recipientReference: "BŁĘDNY", magazineCount: 1, pin: "1234" }, actor);
    expect(second.issue).toMatchObject({ recipientId: recipient.id, recipientName: "Drugi Odbiorca", recipientReference: "DOK-22", magazineCount: 1 });
    await returnWeapon({ issueId: second.issue.id, returnedFromName: "Drugi Odbiorca", pin: "1234" }, actor);
    await withdrawWeapon({ weaponId, documentId, basis: "Protokół wycofania TEST/1", status: "WITHDRAWN", pin: "1234" }, actor);
    expect((await prisma.weapon.findUniqueOrThrow({ where: { id: weaponId } })).status).toBe("WITHDRAWN");
    await expect(issueWeapon({ weaponId, bookId: books.weaponIssue.id, recipientName: "Trzeci Odbiorca", magazineCount: 0, pin: "1234" }, actor)).rejects.toMatchObject({ code: "WEAPON_NOT_AVAILABLE" });
    await expect(withdrawWeapon({ weaponId, documentId, basis: "Powtórzenie", status: "WITHDRAWN", pin: "1234" }, actor)).rejects.toMatchObject({ code: "WEAPON_NOT_WITHDRAWABLE" });
  });

  test("samodzielne wydanie i zwrot amunicji nie pozwalają zejść poniżej zera", async () => {
    const ledgerBeforeIssue = await prisma.ammunitionRegisterEntry.aggregate({ _sum: { quantityIn: true, quantityOut: true } });
    const issue = await issueAmmunition({ bookId: books.ammoIssue.id, sourceBookId: books.ammo.id, caliberId, ammunitionType: "pełnopłaszczowa", quantity: 20, recipientName: "Sekcja sportowa", pin: "1234" }, actor);
    const ledgerAfterIssue = await prisma.ammunitionRegisterEntry.aggregate({ _sum: { quantityIn: true, quantityOut: true } });
    expect(ledgerAfterIssue).toEqual(ledgerBeforeIssue);
    const activeStock = await getAmmoStockBalances(prisma, { bookIds: [books.ammo.id], caliberId });
    expect(activeStock.get(ammoStockKey(books.ammo.id, caliberId))).toMatchObject({ ledger: 75, reserved: 20, available: 55 });
    const closed = await returnAmmunition({ issueId: issue.id, returnedQuantity: 5, pin: "1234" }, actor);
    expect(closed.consumed).toBe(15);
    expect(closed.returned).toBe(5);
    expect(await prisma.ammunitionRegisterEntry.count({ where: { issueId: issue.id, kind: "RETURN" } })).toBe(0);
    expect(await prisma.ammunitionRegisterEntry.aggregate({ where: { issueId: issue.id }, _sum: { quantityOut: true } })).toMatchObject({ _sum: { quantityOut: 15 } });
    const before = await prisma.ammunitionRegisterEntry.aggregate({ _sum: { quantityIn: true, quantityOut: true } });
    await expect(issueAmmunition({ bookId: books.ammoIssue.id, sourceBookId: books.ammo.id, caliberId, ammunitionType: "pełnopłaszczowa", quantity: 1000, recipientName: "Sekcja sportowa", pin: "1234" }, actor)).rejects.toMatchObject({ code: "INSUFFICIENT_AMMO" });
    const after = await prisma.ammunitionRegisterEntry.aggregate({ _sum: { quantityIn: true, quantityOut: true } });
    expect(after).toEqual(before);
  });

  test("automatyczne wydanie wybiera jedną księgę lub rozdziela blokadę, a rozliczenie zapisuje rozchód w kolejności rezerwacji", async () => {
    const [firstBook, secondBook, caliber] = await Promise.all([
      prisma.registerBook.create({ data: { type: "AMMUNITION", series: "D", name: "Źródło 20" } }),
      prisma.registerBook.create({ data: { type: "AMMUNITION", series: "E", name: "Źródło 50" } }),
      prisma.caliber.create({ data: { canonicalName: "10 mm Test podziału", source: "test" } }),
    ]);
    await acquireAmmunition({ bookId: firstBook.id, caliberId: caliber.id, documentId, ammunitionType: "testowa", quantity: 20, basis: "Test źródła D", effectiveAt: new Date(), pin: "1234" }, actor);
    await acquireAmmunition({ bookId: secondBook.id, caliberId: caliber.id, documentId, ammunitionType: "testowa", quantity: 50, basis: "Test źródła E", effectiveAt: new Date(), pin: "1234" }, actor);

    const single = await issueAmmunition({ bookId: books.ammoIssue.id, caliberId: caliber.id, ammunitionType: "testowa", quantity: 30, recipientName: "Odbiorca pojedynczego źródła", pin: "1234" }, actor);
    const singleAllocations = await prisma.ammoIssueAllocation.findMany({ where: { issueId: single.id }, orderBy: { sequence: "asc" } });
    expect(single.allocations).toEqual([{ bookId: secondBook.id, bookSeries: "E", bookName: "Źródło 50", quantity: 30 }]);
    expect(singleAllocations).toMatchObject([{ bookId: secondBook.id, quantity: 30, sequence: 1 }]);
    expect(await prisma.ammunitionRegisterEntry.count({ where: { issueId: single.id } })).toBe(0);

    await expect(issueAmmunition({ bookId: books.ammoIssue.id, sourceBookId: firstBook.id, caliberId: caliber.id, ammunitionType: "testowa", quantity: 21, recipientName: "Odbiorca ręcznego źródła", pin: "1234" }, actor)).rejects.toMatchObject({ code: "INSUFFICIENT_AMMO" });

    const split = await issueAmmunition({ bookId: books.ammoIssue.id, caliberId: caliber.id, ammunitionType: "testowa", quantity: 40, recipientName: "Odbiorca wielu źródeł", pin: "1234" }, actor);
    const splitAllocations = await prisma.ammoIssueAllocation.findMany({ where: { issueId: split.id }, orderBy: { sequence: "asc" } });
    expect(splitAllocations).toHaveLength(2);
    expect(splitAllocations.reduce((sum, allocation) => sum + allocation.quantity, 0)).toBe(40);
    expect(await prisma.ammunitionRegisterEntry.count({ where: { issueId: split.id } })).toBe(0);

    const settlement = await returnAmmunition({ issueId: split.id, returnedQuantity: 10, pin: "1234" }, actor);
    expect(settlement.consumptionAllocations.map((allocation) => allocation.quantity)).toEqual([20, 10]);
    const consumptionEntries = await prisma.ammunitionRegisterEntry.findMany({ where: { issueId: split.id, kind: "CONSUMPTION" }, orderBy: { createdAt: "asc" } });
    expect(consumptionEntries).toHaveLength(2);
    expect(consumptionEntries.reduce((sum, entry) => sum + entry.quantityOut, 0)).toBe(30);
    const returns = await prisma.ammunitionRegisterEntry.findMany({ where: { issueId: split.id, kind: "RETURN" } });
    expect(returns).toHaveLength(0);
  });

  test("pełny zwrot nie zmienia ewidencji, a dokładka dziedziczy dane i rozlicza poprzednie wydanie bez zwrotu", async () => {
    const fullReturn = await issueAmmunition({ bookId: books.ammoIssue.id, sourceBookId: books.ammo.id, caliberId, ammunitionType: "pełnopłaszczowa", quantity: 5, recipientName: "Pełny zwrot", pin: "1234" }, actor);
    const ledgerBeforeReturn = await prisma.ammunitionRegisterEntry.aggregate({ _sum: { quantityIn: true, quantityOut: true } });
    const returned = await returnAmmunition({ issueId: fullReturn.id, returnedQuantity: 5, pin: "1234" }, actor);
    expect(returned).toMatchObject({ returned: 5, consumed: 0, consumptionAllocations: [] });
    expect(await prisma.ammunitionRegisterEntry.aggregate({ _sum: { quantityIn: true, quantityOut: true } })).toEqual(ledgerBeforeReturn);

    const parent = await issueAmmunition({ bookId: books.ammoIssue.id, sourceBookId: books.ammo.id, caliberId, ammunitionType: "pełnopłaszczowa", quantity: 4, recipientName: "Kontynuowane wydanie", recipientReference: "DOK/123", pin: "1234" }, actor);
    const topUp = await topUpAmmunition({ issueId: parent.id, quantity: 3, pin: "1234" }, actor);
    const child = topUp.issue;
    expect(topUp).toMatchObject({ previousRegistryRef: parent.registryRef, previousQuantityConsumed: 4 });
    expect(await prisma.ammoIssue.findUniqueOrThrow({ where: { id: parent.id } })).toMatchObject({ status: "CLOSED", quantityReturned: 0, quantityConsumed: 4 });
    expect(await prisma.ammunitionRegisterEntry.aggregate({ where: { issueId: parent.id }, _sum: { quantityOut: true } })).toMatchObject({ _sum: { quantityOut: 4 } });
    expect(await prisma.ammoIssue.findUniqueOrThrow({ where: { id: child.id } })).toMatchObject({ status: "ACTIVE", parentIssueId: parent.id, bookId: parent.bookId, caliberId: parent.caliberId, ammunitionType: parent.ammunitionType, recipientName: parent.recipientName, recipientReference: "DOK/123", quantityIssued: 3 });
    await expect(topUpAmmunition({ issueId: child.id, quantity: 1000, pin: "1234" }, actor)).rejects.toMatchObject({ code: "INSUFFICIENT_AMMO" });
    expect(await prisma.ammoIssue.findUniqueOrThrow({ where: { id: child.id } })).toMatchObject({ status: "ACTIVE", quantityConsumed: null });
  });

  test("historia wydań broni jest pobierana stronami po 10 rekordów", async () => {
    const baseDate = new Date("2026-09-14T12:00:00Z");
    await prisma.weaponIssue.createMany({ data: Array.from({ length: 11 }, (_, index) => ({
      bookId: books.weaponIssue.id,
      positionNo: 100 + index,
      registryRef: `WB${100 + index}`,
      weaponId,
      status: "CLOSED" as const,
      recipientName: `Odbiorca ${index + 1}`,
      magazineCount: 0,
      issuedAt: new Date(baseDate.getTime() + index * 60_000),
      issuedById: actor.id,
      issuedByName: "Anna Testowa",
      issueConfirmedById: actor.id,
      issueConfirmedAt: baseDate,
      returnedAt: new Date(baseDate.getTime() + index * 60_000 + 30_000),
      returnedById: actor.id,
      returnedByName: "Anna Testowa",
      returnedFromName: `Odbiorca ${index + 1}`,
      returnConfirmedById: actor.id,
      returnConfirmedAt: baseDate,
      weaponNameSnapshot: "Pistolet testowy",
      weaponBrandSnapshot: "PMB",
      caliberSnapshot: "9×19 mm Parabellum",
      serialNumberSnapshot: "PMB-0001",
    })) });
    const [count, firstPage, secondPage] = await Promise.all([
      prisma.weaponIssue.count({ where: { weaponId } }),
      prisma.weaponIssue.findMany({ where: { weaponId }, orderBy: { issuedAt: "desc" }, skip: 0, take: 10 }),
      prisma.weaponIssue.findMany({ where: { weaponId }, orderBy: { issuedAt: "desc" }, skip: 10, take: 10 }),
    ]);
    expect(count).toBe(13);
    expect(firstPage).toHaveLength(10);
    expect(secondPage).toHaveLength(3);
  });

  test("korekta dopisuje zdarzenie i nie nadpisuje wpisu źródłowego", async () => {
    const original = await prisma.ammunitionRegisterEntry.findFirstOrThrow({ orderBy: { positionNo: "asc" } });
    await expect(createCorrection({ entryId: original.id, quantityDelta: 0, note: "Nieprawidłowa korekta zerowa", pin: "1234" }, actor)).rejects.toMatchObject({ code: "INVALID_CORRECTION_QUANTITY" });
    await expect(createCorrection({ entryId: original.id, quantityDelta: 1, note: "Nieprawidłowa korekta dodatnia", pin: "1234" }, actor)).rejects.toMatchObject({ code: "INVALID_CORRECTION_QUANTITY" });
    await expect(createCorrection({ entryId: original.id, quantityDelta: -1_000_000, note: "Korekta przekracza dostępny stan", pin: "1234" }, actor)).rejects.toMatchObject({ code: "INSUFFICIENT_AVAILABLE_AMMO" });
    const result = await createCorrection({ entryId: original.id, quantityDelta: -1, note: "Oczywista omyłka ilościowa", pin: "1234" }, actor);
    expect((await prisma.ammunitionRegisterEntry.findUniqueOrThrow({ where: { id: original.id } })).quantityOut).toBe(original.quantityOut);
    expect(result.entry).toMatchObject({ kind: "CORRECTION", quantityOut: 1, issueId: null });
    expect(await prisma.correctionEvent.count({ where: { correctsAmmoEntryId: original.id, resultingAmmoEntryId: result.entry.id } })).toBe(1);
    expect(await prisma.auditEvent.findFirst({ where: { operation: "REGISTER_ENTRY_CORRECTED", entityId: result.correction.id } })).toBeTruthy();
  });

  test("PIN blokuje się po pięciu błędnych próbach", async () => {
    for (let attempt = 1; attempt <= 5; attempt += 1) await expect(confirmPin(actor.id, "9999")).rejects.toMatchObject({ code: attempt === 5 ? "PIN_LOCKED" : "INVALID_PIN" });
    await expect(confirmPin(actor.id, "1234")).rejects.toMatchObject({ code: "PIN_LOCKED" });
    await prisma.user.update({ where: { id: actor.id }, data: { pinFailedAttempts: 0, pinLockedUntil: null } });
  });

  test("backup zawiera spójny manifest, bazę, załączniki i zdjęcia broni", async () => {
    const result = await createBackup("MANUAL", actor);
    try {
      const zip = new AdmZip(result.path);
      const manifest = JSON.parse(zip.readAsText("manifest.json"));
      expect(manifest).toMatchObject({ format: "pmb-backup", version: 1, schemaVersion: "20260917120000_navigation_recipients_and_corrections", counts: { attachments: 2, weaponImages: 1, ammoAllocations: expect.any(Number), recipients: expect.any(Number), systemSettings: expect.any(Number) } });
      expect(zip.getEntry("database.sqlite")).toBeTruthy();
      expect(zip.getEntry("uploads/documents/doc-one.pdf")).toBeTruthy();
      expect(zip.getEntry("uploads/documents/doc-two.pdf")).toBeTruthy();
      expect(zip.getEntry("uploads/weapons/test-two.png")).toBeTruthy();
      expect(manifest.hashes["database.sqlite"]).toMatch(/^[a-f0-9]{64}$/);
      expect(manifest.hashes["uploads/weapons/test-two.png"]).toMatch(/^[a-f0-9]{64}$/);
      const archive = await readFile(result.path);
      await prisma.attachment.deleteMany({ where: { documentId } });
      await prisma.weaponImage.deleteMany({ where: { weaponId } });
      await rm(resolve(uploadsPath, "documents"), { recursive: true, force: true });
      await rm(resolve(uploadsPath, "weapons"), { recursive: true, force: true });
      await restoreBackup(archive, actor);
      expect(await prisma.attachment.count({ where: { documentId } })).toBe(2);
      expect(await prisma.weaponImage.count({ where: { weaponId } })).toBe(1);
      expect(await readFile(resolve(uploadsPath, "documents/doc-one.pdf"), "utf8")).toBe("document-one");
      expect(await readFile(resolve(uploadsPath, "weapons/test-two.png"), "utf8")).toBe("weapon-image-two");
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
