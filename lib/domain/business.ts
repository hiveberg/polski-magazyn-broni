import type { Prisma } from "@prisma/client";
import { prisma, prepareDatabase } from "@/lib/db";
import { DomainError } from "@/lib/errors";
import { appendAudit } from "@/lib/domain/audit";
import { registryRef } from "@/lib/domain/registers";
import { planAmmoAllocation } from "@/lib/ammunition-allocation";
import { ammoStockKey, getAmmoStockBalances } from "@/lib/ammunition-stock";
import { confirmPin } from "@/lib/auth/pin";
import type { CurrentUser } from "@/lib/auth/session";
import type { ammoAcquisitionSchema, issueAmmoSchema, issueWeaponSchema, returnAmmoSchema, returnWeaponSchema, topUpAmmoSchema, weaponInputSchema } from "@/lib/validation/schemas";
import type { z } from "zod";

type Actor = CurrentUser;
type WeaponInput = z.infer<typeof weaponInputSchema>;
type AmmoAcquisitionInput = z.infer<typeof ammoAcquisitionSchema>;
type IssueWeaponInput = z.infer<typeof issueWeaponSchema>;
type ReturnWeaponInput = z.infer<typeof returnWeaponSchema>;
type IssueAmmoInput = z.infer<typeof issueAmmoSchema>;
type TopUpAmmoInput = z.infer<typeof topUpAmmoSchema>;
type ReturnAmmoInput = z.infer<typeof returnAmmoSchema>;

const actorName = (actor: Actor) => `${actor.firstName} ${actor.lastName}`;
const json = (value: unknown) => JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;

async function allocatePosition(tx: Prisma.TransactionClient, bookId: string, expectedType: "WEAPON" | "AMMUNITION" | "WEAPON_ISSUE" | "AMMUNITION_ISSUE") {
  const book = await tx.registerBook.findUnique({ where: { id: bookId } });
  if (!book || book.type !== expectedType || book.status !== "ACTIVE") throw new DomainError("Wybrana księga nie istnieje, ma niewłaściwy typ albo jest zamknięta.", "INVALID_BOOK");
  const positionNo = book.nextPosition;
  await tx.registerBook.update({ where: { id: book.id }, data: { nextPosition: { increment: 1 } } });
  return { book, positionNo, registryRef: registryRef(book.series, positionNo) };
}

async function ammoBalance(tx: Prisma.TransactionClient, bookId: string, caliberId: string) {
  const totals = await tx.ammunitionRegisterEntry.aggregate({ where: { bookId, caliberId }, _sum: { quantityIn: true, quantityOut: true } });
  return (totals._sum.quantityIn ?? 0) - (totals._sum.quantityOut ?? 0);
}

type CreateAmmoIssueInput = Omit<IssueAmmoInput, "pin">;

async function createAmmoIssueTx(tx: Prisma.TransactionClient, input: CreateAmmoIssueInput, actor: Actor, confirmedAt: Date, weaponIssueId?: string) {
  const caliber = await tx.caliber.findUnique({ where: { id: input.caliberId } });
  if (!caliber?.active) throw new DomainError("Wybrany kaliber jest nieaktywny.", "INVALID_CALIBER");
  if (input.sourceBookId) {
    const selectedSource = await tx.registerBook.findUnique({ where: { id: input.sourceBookId } });
    if (!selectedSource || selectedSource.type !== "AMMUNITION" || selectedSource.status !== "ACTIVE") throw new DomainError("Wskazana księga źródłowa amunicji jest niedostępna.", "INVALID_AMMO_BOOK");
  }
  const sourceBooks = await tx.registerBook.findMany({ where: { type: "AMMUNITION", status: "ACTIVE" }, select: { id: true, series: true, name: true }, orderBy: { series: "asc" } });
  const balances = await getAmmoStockBalances(tx, { bookIds: sourceBooks.map((book) => book.id), caliberId: caliber.id });
  const stocks = sourceBooks.map((book) => ({ ...book, bookId: book.id, available: balances.get(ammoStockKey(book.id, caliber.id))?.available ?? 0 }));
  const plan = planAmmoAllocation(stocks, input.quantity, input.sourceBookId);
  if (!plan.complete) {
    const scope = input.sourceBookId ? "w wybranej księdze" : "łącznie we wszystkich aktywnych księgach";
    throw new DomainError(`Nie można wydać ${input.quantity} szt. amunicji. Dostępny stan ${scope}: ${plan.available} szt.`, "INSUFFICIENT_AMMO");
  }
  if (input.parentIssueId) {
    const parent = await tx.ammoIssue.findUnique({ where: { id: input.parentIssueId } });
    if (!parent || parent.status !== "ACTIVE" || parent.caliberId !== caliber.id) throw new DomainError("Poprzednie wydanie nie jest aktywne albo ma inny kaliber.", "INVALID_PARENT_ISSUE");
    weaponIssueId ??= parent.weaponIssueId ?? undefined;
    await closeAmmoIssueTx(tx, parent.id, 0, actor, confirmedAt);
    await tx.ammoIssueEvent.create({ data: { issueId: parent.id, type: "EXTENDED", effectiveAt: confirmedAt, performedById: actor.id, performedByName: actorName(actor), confirmedById: actor.id, confirmedAt, details: { nextQuantity: input.quantity } } });
  }
  const issuePos = await allocatePosition(tx, input.bookId, "AMMUNITION_ISSUE");
  const primarySourceId = plan.allocations[0].bookId;
  const issue = await tx.ammoIssue.create({ data: { bookId: issuePos.book.id, sourceBookId: primarySourceId, positionNo: issuePos.positionNo, registryRef: issuePos.registryRef, caliberId: caliber.id, ammunitionType: input.ammunitionType, recipientName: input.recipientName, recipientReference: input.recipientReference, quantityIssued: input.quantity, issuedAt: confirmedAt, issuedById: actor.id, issuedByName: actorName(actor), issueConfirmedById: actor.id, issueConfirmedAt: confirmedAt, weaponIssueId, parentIssueId: input.parentIssueId, caliberSnapshot: caliber.canonicalName } });
  const allocations = [] as { bookId: string; bookSeries: string; bookName: string; quantity: number }[];
  for (const [index, allocation] of plan.allocations.entries()) {
    const sourceBook = stocks.find((stock) => stock.id === allocation.bookId)!;
    await tx.ammoIssueAllocation.create({ data: { issueId: issue.id, bookId: sourceBook.id, caliberId: caliber.id, sequence: index + 1, quantity: allocation.quantity } });
    allocations.push({ bookId: sourceBook.id, bookSeries: sourceBook.series, bookName: sourceBook.name, quantity: allocation.quantity });
  }
  await tx.ammoIssueEvent.create({ data: { issueId: issue.id, type: "ISSUED", quantity: input.quantity, effectiveAt: confirmedAt, performedById: actor.id, performedByName: actorName(actor), confirmedById: actor.id, confirmedAt, details: json({ allocations }) } });
  return { ...issue, allocations };
}

export async function addWeapon(input: WeaponInput, actor: Actor) {
  await prepareDatabase();
  const confirmation = await confirmPin(actor.id, input.pin);
  return prisma.$transaction(async (tx) => {
    const [caliber, document] = await Promise.all([tx.caliber.findUnique({ where: { id: input.caliberId } }), tx.document.findUnique({ where: { id: input.documentId } })]);
    if (!caliber?.active) throw new DomainError("Wybrany kaliber jest nieaktywny.", "INVALID_CALIBER");
    if (!document) throw new DomainError("Wskazany dokument nie istnieje.", "INVALID_DOCUMENT");
    const pos = await allocatePosition(tx, input.bookId, "WEAPON");
    const duplicate = await tx.weapon.findFirst({ where: { serialNumber: input.serialNumber } });
    if (duplicate) throw new DomainError(`Broń o numerze ${input.serialNumber} jest już zewidencjonowana jako ${duplicate.registryRef}.`, "DUPLICATE_SERIAL");
    const weapon = await tx.weapon.create({ data: { bookId: pos.book.id, positionNo: pos.positionNo, registryRef: pos.registryRef, name: input.name, brand: input.brand, caliberId: caliber.id, productionYear: input.productionYear, weaponSeries: input.weaponSeries, serialNumber: input.serialNumber, otherIdentifyingMarks: input.otherIdentifyingMarks, accessories: input.accessories, type: input.type, acquisitionBasis: input.acquisitionBasis, acquisitionDate: input.acquisitionDate, registeredAt: input.registeredAt, certificateNumber: input.certificateNumber, notes: input.notes, acquisitionDocumentId: document.id } });
    const snapshot = json({ registryRef: weapon.registryRef, name: weapon.name, brand: weapon.brand, caliber: caliber.canonicalName, productionYear: weapon.productionYear, weaponSeries: weapon.weaponSeries, serialNumber: weapon.serialNumber, otherIdentifyingMarks: weapon.otherIdentifyingMarks, accessories: weapon.accessories, certificateNumber: weapon.certificateNumber });
    await tx.weaponRegisterEntry.create({ data: { weaponId: weapon.id, bookId: pos.book.id, positionNo: pos.positionNo, registryRef: pos.registryRef, eventType: "REGISTRATION", effectiveAt: input.registeredAt, snapshot, basis: input.acquisitionBasis, documentId: document.id, createdById: actor.id, createdByName: actorName(actor), confirmedById: actor.id, confirmedAt: confirmation.confirmedAt, confirmationMethod: "PIN" } });
    await tx.weaponEvent.create({ data: { weaponId: weapon.id, type: "REGISTERED", effectiveAt: input.registeredAt, snapshot, basis: input.acquisitionBasis, documentId: document.id, performedById: actor.id, performedByName: actorName(actor), confirmedById: actor.id, confirmedAt: confirmation.confirmedAt, confirmationMethod: "PIN" } });
    await appendAudit(tx, { userId: actor.id, userSnapshot: actorName(actor), operation: "WEAPON_REGISTERED", entityType: "Weapon", entityId: weapon.id, sessionId: actor.sessionId, payload: json({ registryRef: pos.registryRef, snapshot, documentId: document.id }) });
    return weapon;
  });
}

export async function acquireAmmunition(input: AmmoAcquisitionInput, actor: Actor) {
  await prepareDatabase();
  const confirmation = await confirmPin(actor.id, input.pin);
  return prisma.$transaction(async (tx) => {
    const [caliber, document] = await Promise.all([tx.caliber.findUnique({ where: { id: input.caliberId } }), tx.document.findUnique({ where: { id: input.documentId } })]);
    if (!caliber?.active) throw new DomainError("Wybrany kaliber jest nieaktywny.", "INVALID_CALIBER");
    if (!document) throw new DomainError("Wskazany dokument nie istnieje.", "INVALID_DOCUMENT");
    const pos = await allocatePosition(tx, input.bookId, "AMMUNITION");
    const current = await ammoBalance(tx, input.bookId, input.caliberId);
    const entry = await tx.ammunitionRegisterEntry.create({ data: { bookId: input.bookId, positionNo: pos.positionNo, registryRef: pos.registryRef, caliberId: caliber.id, ammunitionType: input.ammunitionType, kind: "ACQUISITION", basis: input.basis, documentId: document.id, quantityIn: input.quantity, balanceAfter: current + input.quantity, effectiveAt: input.effectiveAt, createdById: actor.id, createdByName: actorName(actor), confirmedById: actor.id, confirmedAt: confirmation.confirmedAt, confirmationMethod: "PIN" } });
    await appendAudit(tx, { userId: actor.id, userSnapshot: actorName(actor), operation: "AMMO_ACQUIRED", entityType: "AmmunitionRegisterEntry", entityId: entry.id, sessionId: actor.sessionId, payload: json({ registryRef: entry.registryRef, caliber: caliber.canonicalName, quantity: input.quantity, balanceAfter: entry.balanceAfter, documentId: document.id }) });
    return entry;
  });
}

export async function issueWeapon(input: IssueWeaponInput, actor: Actor) {
  await prepareDatabase();
  const confirmation = await confirmPin(actor.id, input.pin);
  return prisma.$transaction(async (tx) => {
    const weapon = await tx.weapon.findUnique({ where: { id: input.weaponId }, include: { caliber: true } });
    if (!weapon) throw new DomainError("Nie znaleziono broni.", "WEAPON_NOT_FOUND", 404);
    if (weapon.status !== "IN_STORAGE") throw new DomainError(weapon.status === "ISSUED" ? "Nie można wydać tej broni, ponieważ jest już wydana." : "Nie można wydać broni wycofanej, przekazanej lub zdjętej z ewidencji.", "WEAPON_NOT_AVAILABLE");
    const pos = await allocatePosition(tx, input.bookId, "WEAPON_ISSUE");
    const issue = await tx.weaponIssue.create({ data: { bookId: pos.book.id, positionNo: pos.positionNo, registryRef: pos.registryRef, weaponId: weapon.id, recipientName: input.recipientName, recipientReference: input.recipientReference, magazineCount: input.magazineCount, issuedAt: confirmation.confirmedAt, issuedById: actor.id, issuedByName: actorName(actor), issueConfirmedById: actor.id, issueConfirmedAt: confirmation.confirmedAt, weaponNameSnapshot: weapon.name, weaponBrandSnapshot: weapon.brand, caliberSnapshot: weapon.caliber.canonicalName, productionYearSnapshot: weapon.productionYear, weaponSeriesSnapshot: weapon.weaponSeries, serialNumberSnapshot: weapon.serialNumber, certificateSnapshot: weapon.certificateNumber } });
    await tx.weapon.update({ where: { id: weapon.id }, data: { status: "ISSUED" } });
    await tx.weaponEvent.create({ data: { weaponId: weapon.id, type: "ISSUED", effectiveAt: confirmation.confirmedAt, snapshot: json({ registryRef: weapon.registryRef, issueRegistryRef: issue.registryRef, recipientName: input.recipientName, magazineCount: input.magazineCount }), performedById: actor.id, performedByName: actorName(actor), confirmedById: actor.id, confirmedAt: confirmation.confirmedAt, confirmationMethod: "PIN", relatedEntityType: "WeaponIssue", relatedEntityId: issue.id } });
    let ammoIssue = null;
    if (input.ammo) ammoIssue = await createAmmoIssueTx(tx, { bookId: input.ammo.issueBookId, sourceBookId: input.ammo.sourceBookId, quantity: input.ammo.quantity, ammunitionType: input.ammo.ammunitionType, caliberId: weapon.caliberId, recipientName: input.recipientName, recipientReference: input.recipientReference }, actor, confirmation.confirmedAt, issue.id);
    await appendAudit(tx, { userId: actor.id, userSnapshot: actorName(actor), operation: "WEAPON_ISSUED", entityType: "WeaponIssue", entityId: issue.id, sessionId: actor.sessionId, payload: json({ issueRegistryRef: issue.registryRef, weaponRegistryRef: weapon.registryRef, recipientName: input.recipientName, magazineCount: input.magazineCount, ammoIssueId: ammoIssue?.id ?? null }) });
    return { issue, ammoIssue };
  });
}

export async function returnWeapon(input: ReturnWeaponInput, actor: Actor) {
  await prepareDatabase();
  const confirmation = await confirmPin(actor.id, input.pin);
  return prisma.$transaction(async (tx) => {
    const issue = await tx.weaponIssue.findUnique({ where: { id: input.issueId }, include: { weapon: true, ammoIssues: { where: { status: "ACTIVE" } } } });
    if (!issue || issue.status !== "ACTIVE") throw new DomainError("Wydanie broni nie jest aktywne.", "ISSUE_NOT_ACTIVE");
    const linkedAmmo = issue.ammoIssues[0];
    if (linkedAmmo) {
      const returned = input.returnedAmmoQuantity ?? 0;
      if (returned > linkedAmmo.quantityIssued) throw new DomainError(`Nie można zwrócić ${returned} szt. Z tego wydania pochodzi ${linkedAmmo.quantityIssued} szt.`, "TOO_MUCH_AMMO_RETURNED");
      await closeAmmoIssueTx(tx, linkedAmmo.id, returned, actor, confirmation.confirmedAt);
    } else if ((input.returnedAmmoQuantity ?? 0) > 0) throw new DomainError("Z tym wydaniem broni nie powiązano amunicji.", "NO_LINKED_AMMO");
    await tx.weaponIssue.update({ where: { id: issue.id }, data: { status: "CLOSED", returnedAt: confirmation.confirmedAt, returnedById: actor.id, returnedByName: actorName(actor), returnedFromName: input.returnedFromName, returnConfirmedById: actor.id, returnConfirmedAt: confirmation.confirmedAt } });
    await tx.weapon.update({ where: { id: issue.weaponId }, data: { status: "IN_STORAGE" } });
    await tx.weaponEvent.create({ data: { weaponId: issue.weaponId, type: "RETURNED", effectiveAt: confirmation.confirmedAt, snapshot: json({ issueRegistryRef: issue.registryRef, returnedFromName: input.returnedFromName, returnedAmmoQuantity: input.returnedAmmoQuantity ?? 0 }), performedById: actor.id, performedByName: actorName(actor), confirmedById: actor.id, confirmedAt: confirmation.confirmedAt, confirmationMethod: "PIN", relatedEntityType: "WeaponIssue", relatedEntityId: issue.id } });
    await appendAudit(tx, { userId: actor.id, userSnapshot: actorName(actor), operation: "WEAPON_RETURNED", entityType: "WeaponIssue", entityId: issue.id, sessionId: actor.sessionId, payload: json({ weaponRegistryRef: issue.weapon.registryRef, returnedAmmoQuantity: input.returnedAmmoQuantity ?? 0 }) });
    return issue;
  });
}

async function closeAmmoIssueTx(tx: Prisma.TransactionClient, issueId: string, returnedQuantity: number, actor: Actor, confirmedAt: Date) {
  const issue = await tx.ammoIssue.findUnique({ where: { id: issueId }, include: { caliber: true, allocations: { include: { book: true }, orderBy: { sequence: "asc" } } } });
  if (!issue || issue.status !== "ACTIVE") throw new DomainError("Wydanie amunicji nie jest aktywne.", "ISSUE_NOT_ACTIVE");
  if (returnedQuantity < 0 || returnedQuantity > issue.quantityIssued) throw new DomainError(`Zwrot musi mieścić się między 0 a ${issue.quantityIssued} szt.`, "INVALID_RETURN_QUANTITY");
  if (!issue.allocations.length || issue.allocations.reduce((sum, allocation) => sum + allocation.quantity, 0) !== issue.quantityIssued) throw new DomainError("Wydanie nie ma kompletnej rezerwacji źródłowej.", "INVALID_AMMO_RESERVATION");
  const consumed = issue.quantityIssued - returnedQuantity;
  let remainingConsumption = consumed;
  const consumptionAllocations: { bookId: string; bookSeries: string; bookName: string; quantity: number }[] = [];
  for (const allocation of issue.allocations) {
    if (remainingConsumption === 0) break;
    const quantity = Math.min(allocation.quantity, remainingConsumption);
    const current = await ammoBalance(tx, allocation.bookId, issue.caliberId);
    if (current < quantity) throw new DomainError(`Stan ewidencyjny księgi ${allocation.book.series} jest niższy od rozliczanego rozchodu.`, "INSUFFICIENT_LEDGER_BALANCE");
    const position = await allocatePosition(tx, allocation.bookId, "AMMUNITION");
    await tx.ammunitionRegisterEntry.create({ data: { bookId: allocation.bookId, positionNo: position.positionNo, registryRef: position.registryRef, caliberId: issue.caliberId, ammunitionType: issue.ammunitionType, kind: "CONSUMPTION", basis: `Rozchód z rozliczenia wydania ${issue.registryRef}`, quantityOut: quantity, balanceAfter: current - quantity, issueId: issue.id, effectiveAt: confirmedAt, createdById: actor.id, createdByName: actorName(actor), confirmedById: actor.id, confirmedAt, confirmationMethod: "PIN" } });
    consumptionAllocations.push({ bookId: allocation.bookId, bookSeries: allocation.book.series, bookName: allocation.book.name, quantity });
    remainingConsumption -= quantity;
  }
  if (returnedQuantity > 0) await tx.ammoIssueEvent.create({ data: { issueId: issue.id, type: "RETURNED", quantity: returnedQuantity, effectiveAt: confirmedAt, performedById: actor.id, performedByName: actorName(actor), confirmedById: actor.id, confirmedAt } });
  const closedIssue = await tx.ammoIssue.update({ where: { id: issue.id }, data: { status: "CLOSED", quantityReturned: returnedQuantity, quantityConsumed: consumed, closedAt: confirmedAt, closedById: actor.id, closedByName: actorName(actor), returnConfirmedById: actor.id, returnConfirmedAt: confirmedAt } });
  await tx.ammoIssueEvent.create({ data: { issueId: issue.id, type: "CONSUMED", quantity: consumed, effectiveAt: confirmedAt, performedById: actor.id, performedByName: actorName(actor), confirmedById: actor.id, confirmedAt, details: json({ allocations: consumptionAllocations }) } });
  return { issue: closedIssue, returned: returnedQuantity, consumed, consumptionAllocations };
}

export async function issueAmmunition(input: IssueAmmoInput, actor: Actor) {
  await prepareDatabase();
  const confirmation = await confirmPin(actor.id, input.pin);
  return prisma.$transaction(async (tx) => {
    const issueInput = { bookId: input.bookId, sourceBookId: input.sourceBookId, caliberId: input.caliberId, ammunitionType: input.ammunitionType, quantity: input.quantity, recipientName: input.recipientName, recipientReference: input.recipientReference, parentIssueId: input.parentIssueId };
    const issue = await createAmmoIssueTx(tx, issueInput, actor, confirmation.confirmedAt);
    await appendAudit(tx, { userId: actor.id, userSnapshot: actorName(actor), operation: "AMMO_ISSUED", entityType: "AmmoIssue", entityId: issue.id, sessionId: actor.sessionId, payload: json({ registryRef: issue.registryRef, caliberId: issue.caliberId, quantity: issue.quantityIssued, recipientName: issue.recipientName, parentIssueId: issue.parentIssueId, allocations: issue.allocations }) });
    return issue;
  });
}

export async function topUpAmmunition(input: TopUpAmmoInput, actor: Actor) {
  await prepareDatabase();
  const confirmation = await confirmPin(actor.id, input.pin);
  return prisma.$transaction(async (tx) => {
    const parent = await tx.ammoIssue.findUnique({ where: { id: input.issueId } });
    if (!parent || parent.status !== "ACTIVE") throw new DomainError("Wydanie amunicji nie jest aktywne.", "ISSUE_NOT_ACTIVE");
    const issue = await createAmmoIssueTx(tx, {
      bookId: parent.bookId,
      caliberId: parent.caliberId,
      ammunitionType: parent.ammunitionType,
      quantity: input.quantity,
      recipientName: parent.recipientName,
      recipientReference: parent.recipientReference ?? undefined,
      parentIssueId: parent.id,
    }, actor, confirmation.confirmedAt, parent.weaponIssueId ?? undefined);
    await appendAudit(tx, {
      userId: actor.id,
      userSnapshot: actorName(actor),
      operation: "AMMO_ISSUED",
      entityType: "AmmoIssue",
      entityId: issue.id,
      sessionId: actor.sessionId,
      payload: json({ action: "TOP_UP", previousIssueId: parent.id, previousRegistryRef: parent.registryRef, previousQuantityConsumed: parent.quantityIssued, registryRef: issue.registryRef, caliberId: issue.caliberId, quantity: issue.quantityIssued, recipientName: issue.recipientName, weaponIssueId: issue.weaponIssueId, allocations: issue.allocations }),
    });
    return { previousRegistryRef: parent.registryRef, previousQuantityConsumed: parent.quantityIssued, issue };
  });
}

export async function returnAmmunition(input: ReturnAmmoInput, actor: Actor) {
  await prepareDatabase();
  const confirmation = await confirmPin(actor.id, input.pin);
  return prisma.$transaction(async (tx) => {
    const result = await closeAmmoIssueTx(tx, input.issueId, input.returnedQuantity, actor, confirmation.confirmedAt);
    await appendAudit(tx, { userId: actor.id, userSnapshot: actorName(actor), operation: "AMMO_RETURNED", entityType: "AmmoIssue", entityId: input.issueId, sessionId: actor.sessionId, payload: json({ returnedQuantity: input.returnedQuantity, consumedQuantity: result.consumed, consumptionAllocations: result.consumptionAllocations }) });
    return result;
  });
}

export async function withdrawWeapon(input: { weaponId: string; documentId: string; basis: string; recipient?: string; pin: string; status: "WITHDRAWN" | "TRANSFERRED" | "DEREGISTERED" }, actor: Actor) {
  const confirmation = await confirmPin(actor.id, input.pin);
  return prisma.$transaction(async (tx) => {
    const weapon = await tx.weapon.findUnique({ where: { id: input.weaponId }, include: { caliber: true } });
    if (!weapon || weapon.status !== "IN_STORAGE") throw new DomainError("Można wycofać wyłącznie broń znajdującą się aktualnie w magazynie.", "WEAPON_NOT_WITHDRAWABLE");
    const document = await tx.document.findUnique({ where: { id: input.documentId } });
    if (!document) throw new DomainError("Wskazany dokument nie istnieje.", "INVALID_DOCUMENT");
    await tx.weapon.update({ where: { id: weapon.id }, data: { status: input.status } });
    const snapshot = json({ registryRef: weapon.registryRef, previousStatus: weapon.status, status: input.status, basis: input.basis, recipient: input.recipient ?? null });
    await tx.weaponRegisterEntry.create({ data: { weaponId: weapon.id, bookId: weapon.bookId, positionNo: weapon.positionNo, registryRef: weapon.registryRef, eventType: input.status === "TRANSFERRED" ? "TRANSFER" : input.status === "DEREGISTERED" ? "DEREGISTRATION" : "WITHDRAWAL", effectiveAt: confirmation.confirmedAt, snapshot, basis: input.basis, documentId: document.id, createdById: actor.id, createdByName: actorName(actor), confirmedById: actor.id, confirmedAt: confirmation.confirmedAt, confirmationMethod: "PIN" } });
    await tx.weaponEvent.create({ data: { weaponId: weapon.id, type: input.status, effectiveAt: confirmation.confirmedAt, snapshot, basis: input.basis, documentId: document.id, performedById: actor.id, performedByName: actorName(actor), confirmedById: actor.id, confirmedAt: confirmation.confirmedAt, confirmationMethod: "PIN" } });
    await appendAudit(tx, { userId: actor.id, userSnapshot: actorName(actor), operation: `WEAPON_${input.status}`, entityType: "Weapon", entityId: weapon.id, sessionId: actor.sessionId, payload: snapshot });
    return weapon;
  });
}

export async function createCorrection(input: { entityType: "WeaponRegisterEntry" | "AmmunitionRegisterEntry"; entryId: string; correctedValues: Record<string, unknown>; reason: string; pin: string }, actor: Actor) {
  const confirmation = await confirmPin(actor.id, input.pin);
  return prisma.$transaction(async (tx) => {
    const original = input.entityType === "WeaponRegisterEntry" ? await tx.weaponRegisterEntry.findUnique({ where: { id: input.entryId } }) : await tx.ammunitionRegisterEntry.findUnique({ where: { id: input.entryId } });
    if (!original) throw new DomainError("Nie znaleziono wpisu do korekty.", "ENTRY_NOT_FOUND", 404);
    const correction = await tx.correctionEvent.create({ data: { entityType: input.entityType, entityId: input.entryId, correctsWeaponEntryId: input.entityType === "WeaponRegisterEntry" ? input.entryId : undefined, correctsAmmoEntryId: input.entityType === "AmmunitionRegisterEntry" ? input.entryId : undefined, previousSnapshot: json(original), correctedValues: json(input.correctedValues), reason: input.reason, correctedById: actor.id, correctedByName: actorName(actor), correctedAt: confirmation.confirmedAt, confirmedById: actor.id, confirmationMethod: "PIN" } });
    await appendAudit(tx, { userId: actor.id, userSnapshot: actorName(actor), operation: "REGISTER_ENTRY_CORRECTED", entityType: "CorrectionEvent", entityId: correction.id, sessionId: actor.sessionId, payload: json({ corrects: input.entryId, original, correctedValues: input.correctedValues, reason: input.reason }) });
    return correction;
  });
}
