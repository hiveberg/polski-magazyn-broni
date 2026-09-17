import { ammoLedgerKindLabels, labelFor, weaponEventTypeLabels, weaponRegisterEventTypeLabels } from "@/lib/labels";

export type DocumentOperation = {
  id: string;
  date: string;
  type: string;
  subject: string;
  actor: string;
  href: string | null;
};

type SourceDocument = {
  weaponEntries: Array<{ id: string; weaponId: string; registryRef: string; eventType: string; effectiveAt: Date; createdByName: string; weapon: { id: string; registryRef: string; name: string } }>;
  ammoEntries: Array<{ id: string; registryRef: string; kind: string; effectiveAt: Date; createdByName: string; quantityIn: number; quantityOut: number; caliber: { canonicalName: string } }>;
  authorizations: Array<{ id: string; grantedAt: Date; user: { firstName: string; lastName: string } }>;
  weapons: Array<{ id: string; registryRef: string; name: string; registeredAt: Date }>;
  weaponEvents: Array<{ id: string; weaponId: string; type: string; effectiveAt: Date; performedByName: string; weapon: { id: string; registryRef: string; name: string } }>;
};

export function buildDocumentOperations(document: SourceDocument): DocumentOperation[] {
  const operations: DocumentOperation[] = [];
  const legalWeaponOperations = new Set<string>();
  const representedWeapons = new Set<string>();

  for (const entry of document.weaponEntries) {
    legalWeaponOperations.add(`${entry.weaponId}:${entry.effectiveAt.getTime()}`);
    representedWeapons.add(entry.weaponId);
    operations.push({
      id: `weapon-entry:${entry.id}`,
      date: entry.effectiveAt.toISOString(),
      type: labelFor(weaponRegisterEventTypeLabels, entry.eventType, "Operacja na broni"),
      subject: `${entry.registryRef} · ${entry.weapon.name}`,
      actor: entry.createdByName,
      href: `/weapons/${entry.weapon.id}`,
    });
  }

  for (const entry of document.ammoEntries) {
    const quantity = entry.quantityIn > 0 ? `+${entry.quantityIn}` : `−${entry.quantityOut}`;
    operations.push({
      id: `ammo-entry:${entry.id}`,
      date: entry.effectiveAt.toISOString(),
      type: labelFor(ammoLedgerKindLabels, entry.kind, "Operacja na amunicji"),
      subject: `${entry.registryRef} · ${entry.caliber.canonicalName} · ${quantity} szt.`,
      actor: entry.createdByName,
      href: "/registers/ammunition",
    });
  }

  for (const authorization of document.authorizations) {
    operations.push({
      id: `authorization:${authorization.id}`,
      date: authorization.grantedAt.toISOString(),
      type: "Upoważnienie użytkownika",
      subject: `${authorization.user.firstName} ${authorization.user.lastName}`,
      actor: `${authorization.user.firstName} ${authorization.user.lastName}`,
      href: "/administration/users",
    });
  }

  for (const weapon of document.weapons) {
    if (representedWeapons.has(weapon.id)) continue;
    representedWeapons.add(weapon.id);
    operations.push({
      id: `weapon:${weapon.id}`,
      date: weapon.registeredAt.toISOString(),
      type: "Nabycie broni",
      subject: `${weapon.registryRef} · ${weapon.name}`,
      actor: "—",
      href: `/weapons/${weapon.id}`,
    });
  }

  for (const event of document.weaponEvents) {
    if (legalWeaponOperations.has(`${event.weaponId}:${event.effectiveAt.getTime()}`)) continue;
    operations.push({
      id: `weapon-event:${event.id}`,
      date: event.effectiveAt.toISOString(),
      type: labelFor(weaponEventTypeLabels, event.type, "Operacja na broni"),
      subject: `${event.weapon.registryRef} · ${event.weapon.name}`,
      actor: event.performedByName,
      href: `/weapons/${event.weapon.id}`,
    });
  }

  return operations.sort((left, right) => new Date(right.date).getTime() - new Date(left.date).getTime());
}
