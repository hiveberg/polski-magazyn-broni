import { hash } from "@node-rs/argon2";
import { PrismaClient, BookType, UserRole, WeaponStatus, WeaponType, DocumentType } from "@prisma/client";
import preset from "../data/calibers.modern.json";

process.env.DATABASE_URL ??= "file:../data/database.sqlite";
const prisma = new PrismaClient();

const argon = { memoryCost: 19456, timeCost: 2, parallelism: 1 };

async function seedCalibers() {
  for (const item of preset.calibers) {
    const caliber = await prisma.caliber.upsert({
      where: { canonicalName: item.canonicalName },
      update: { source: item.source, sourceId: item.sourceId, cartridgeType: item.cartridgeType, metadata: item.metadata },
      create: { canonicalName: item.canonicalName, source: item.source, sourceId: item.sourceId, cartridgeType: item.cartridgeType, metadata: item.metadata },
    });
    const candidates = [item.canonicalName, ...item.aliases];
    for (const alias of candidates) {
      const normalized = alias.normalize("NFKC").toLocaleLowerCase("pl-PL").replace(/[×xX]/g, "x").replace(/\s+/g, "").replace(/^\./, "");
      await prisma.caliberAlias.upsert({ where: { normalized }, update: { alias, caliberId: caliber.id }, create: { alias, normalized, caliberId: caliber.id } });
    }
  }
}

async function seedBase() {
  await seedCalibers();
  const existingBootstrap = await prisma.user.findUnique({ where: { login: "admin" } });
  if (!existingBootstrap) await prisma.user.create({ data: { firstName: "Administrator", lastName: "Bootstrap", login: "admin", passwordHash: await hash("admin", argon), role: UserRole.ADMIN, active: true, isAuthorized: false, forcePasswordChange: true, isBootstrap: true } });
  await prisma.systemSetting.upsert({ where: { key: "timezone" }, update: {}, create: { key: "timezone", value: "Europe/Warsaw" } });
  await prisma.systemSetting.upsert({ where: { key: "backupSchedule" }, update: {}, create: { key: "backupSchedule", value: { enabled: true, hour: 2, minute: 0, retentionDays: 30 } } });
  await prisma.systemSetting.upsert({ where: { key: "showInactiveWeaponsInGrid" }, update: {}, create: { key: "showInactiveWeaponsInGrid", value: true } });
}

async function seedDemo() {
  const passwordHash = await hash("Magazyn123!", argon);
  const pinHash = await hash("1234", argon);
  const user = await prisma.user.upsert({ where: { login: "jan.kowalski" }, update: { role: UserRole.AUTHORIZED, isAuthorized: true }, create: { firstName: "Jan", lastName: "Kowalski", login: "jan.kowalski", passwordHash, pinHash, role: UserRole.AUTHORIZED, active: true, isAuthorized: true, forcePasswordChange: false } });
  const books = await Promise.all([
    [BookType.WEAPON, "A", "Broń krótka"], [BookType.WEAPON, "B", "Broń długa"],
    [BookType.AMMUNITION, "A", "Amunicja sportowa"], [BookType.AMMUNITION, "B", "Amunicja karabinowa"],
    [BookType.WEAPON_ISSUE, "A", "Wydawanie broni"], [BookType.AMMUNITION_ISSUE, "A", "Wydawanie amunicji"],
  ].map(([type, series, name]) => prisma.registerBook.upsert({ where: { type_series: { type: type as BookType, series: String(series) } }, update: {}, create: { type: type as BookType, series: String(series), name: String(name) } })));
  const [weaponA, weaponB, ammoC, ammoD] = books;
  const document = await prisma.document.upsert({ where: { id: "demo-acquisition" }, update: {}, create: { id: "demo-acquisition", type: DocumentType.INVOICE, number: "FV/DEMO/2026", documentDate: new Date("2026-09-01T10:00:00Z"), description: "Dokument demonstracyjny", createdById: user.id, createdByName: "Jan Kowalski" } });
  const caliberNames = ["9×19 mm Parabellum", ".45 ACP", ".223 Remington", "7,62×39 mm", ".308 Winchester", "12/70"];
  const calibers = new Map((await prisma.caliber.findMany({ where: { canonicalName: { in: caliberNames } } })).map((c) => [c.canonicalName, c]));
  const handguns = ["Glock 17 Gen5", "Walther P99", "SIG Sauer P320", "CZ P-10 C", "Beretta 92FS", "HK USP", "Canik TP9", "FN Five-seveN", "Steyr M9-A2", "Beretta APX", "Colt 1911", "H&K P30", "Glock 19", "SIG P226", "Ruger SR9", "Walther PDP", "Springfield XD", "CZ 75 SP-01", "Taurus G3c", "Glock 34"];
  const longGuns = ["AR-15 M4", "AK pattern", "Remington 700", "Tikka T3x", "Steyr AUG A3", "FN SCAR-L", "HK MR223", "Sako TRG", "Mossberg 590", "Benelli M4", "CZ 557", "Winchester SXP", "Savage 110", "Mauser M18", "Bergara B14", "Howa 1500", "Ruger Precision", "Barrett M82", "Remington 870", "Izhmash Saiga"];
  const createWeapon = async (name: string, index: number, type: WeaponType) => {
    const book = type === WeaponType.HANDGUN ? weaponA : weaponB;
    const caliberName = type === WeaponType.HANDGUN ? (index === 11 ? ".45 ACP" : "9×19 mm Parabellum") : ([".223 Remington", "7,62×39 mm", ".308 Winchester", "12/70"][index % 4]);
    const positionNo = index + 1; const registryRef = `${book.series}${positionNo}`;
    const status = index === 5 || index === 16 ? WeaponStatus.WITHDRAWN : index === 1 || index === 7 || index === 17 ? WeaponStatus.ISSUED : WeaponStatus.IN_STORAGE;
    await prisma.weapon.upsert({ where: { registryRef }, update: {}, create: { bookId: book.id, positionNo, registryRef, name, brand: name.split(" ")[0], caliberId: calibers.get(caliberName)!.id, productionYear: 2020, serialNumber: `DEMO-${book.series}-${String(positionNo).padStart(4, "0")}`, accessories: "2 magazynki", type, acquisitionBasis: "Faktura FV/DEMO/2026", acquisitionDate: new Date("2026-09-01T10:00:00Z"), registeredAt: new Date("2026-09-01T10:00:00Z"), status, acquisitionDocumentId: document.id } });
  };
  await Promise.all(handguns.map((name, i) => createWeapon(name, i, WeaponType.HANDGUN)));
  await Promise.all(longGuns.map((name, i) => createWeapon(name, i, WeaponType.LONG_GUN)));
  await prisma.registerBook.update({ where: { id: weaponA.id }, data: { nextPosition: 21 } });
  await prisma.registerBook.update({ where: { id: weaponB.id }, data: { nextPosition: 21 } });
  for (const [book, caliberName, quantity] of [[ammoC, "9×19 mm Parabellum", 8250], [ammoD, ".223 Remington", 2100], [ammoD, "7,62×39 mm", 1500]] as const) {
    const existing = await prisma.ammunitionRegisterEntry.findFirst({ where: { bookId: book.id, caliberId: calibers.get(caliberName)!.id } });
    if (!existing) {
      const currentBook = await prisma.registerBook.findUniqueOrThrow({ where: { id: book.id } });
      await prisma.$transaction([
        prisma.ammunitionRegisterEntry.create({ data: { bookId: book.id, positionNo: currentBook.nextPosition, registryRef: `${book.series}${currentBook.nextPosition}`, caliberId: calibers.get(caliberName)!.id, ammunitionType: "pełnopłaszczowa", kind: "ACQUISITION", basis: document.description, documentId: document.id, quantityIn: quantity, balanceAfter: quantity, effectiveAt: new Date("2026-09-01T10:00:00Z"), createdById: user.id, createdByName: "Jan Kowalski" } }),
        prisma.registerBook.update({ where: { id: book.id }, data: { nextPosition: { increment: 1 } } }),
      ]);
    }
  }
}

async function main() {
  await seedBase();
  if (process.argv.includes("--demo")) await seedDemo();
  console.log(`Seed zakończony (${preset.calibers.length} kalibrów${process.argv.includes("--demo") ? ", dane demonstracyjne" : ""}).`);
}

main().finally(() => prisma.$disconnect());
