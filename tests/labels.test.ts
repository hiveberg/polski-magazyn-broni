import {
  AmmoIssueEventType,
  AmmoLedgerKind,
  BackupStatus,
  BackupType,
  BookStatus,
  BookType,
  ConfirmationMethod,
  DocumentType,
  IssueStatus,
  UserRole,
  WeaponEventType,
  WeaponRegisterEventType,
  WeaponStatus,
  WeaponType,
} from "@prisma/client";
import { describe, expect, it } from "vitest";
import {
  ammoIssueEventTypeLabels,
  ammoLedgerKindLabels,
  auditEntityTypeLabels,
  auditOperationLabels,
  backupStatusLabels,
  backupTypeLabels,
  bookStatusLabels,
  bookTypeLabels,
  confirmationMethodLabels,
  documentTypeLabels,
  issueStatusLabels,
  labelFor,
  userRoleLabels,
  weaponEventTypeLabels,
  weaponRegisterEventTypeLabels,
  weaponStatusLabels,
  weaponTypeLabels,
} from "@/lib/labels";

const enumLabelSets: Array<[string, Record<string, string>, Readonly<Record<string, string>>]> = [
  ["rola użytkownika", UserRole, userRoleLabels],
  ["typ księgi", BookType, bookTypeLabels],
  ["status księgi", BookStatus, bookStatusLabels],
  ["typ broni", WeaponType, weaponTypeLabels],
  ["status broni", WeaponStatus, weaponStatusLabels],
  ["rodzaj wpisu broni", WeaponRegisterEventType, weaponRegisterEventTypeLabels],
  ["zdarzenie broni", WeaponEventType, weaponEventTypeLabels],
  ["status wydania", IssueStatus, issueStatusLabels],
  ["rodzaj wpisu amunicji", AmmoLedgerKind, ammoLedgerKindLabels],
  ["zdarzenie wydania amunicji", AmmoIssueEventType, ammoIssueEventTypeLabels],
  ["typ dokumentu", DocumentType, documentTypeLabels],
  ["metoda potwierdzenia", ConfirmationMethod, confirmationMethodLabels],
  ["typ kopii", BackupType, backupTypeLabels],
  ["status kopii", BackupStatus, backupStatusLabels],
];

describe("polskie etykiety kluczy systemowych", () => {
  it.each(enumLabelSets)("obejmują każdą wartość: %s", (_name, values, labels) => {
    for (const value of Object.values(values)) {
      expect(labels[value]).toBeTruthy();
      expect(labels[value]).not.toBe(value);
    }
  });

  it("tłumaczy klucze widoczne w audycie", () => {
    expect(labelFor(auditOperationLabels, "BOOK_CREATED", "Inna operacja")).toBe("Utworzenie księgi");
    expect(labelFor(auditEntityTypeLabels, "RegisterBook", "Inny obiekt")).toBe("Księga");
    expect(labelFor(auditOperationLabels, "FUTURE_EVENT", "Inna operacja")).toBe("Inna operacja");
  });
});
