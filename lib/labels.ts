import type {
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

export const userRoleLabels = {
  ADMIN: "Administrator",
  AUTHORIZED: "Uprawniony",
} satisfies Record<UserRole, string>;

export const bookTypeLabels = {
  WEAPON: "Ewidencja broni",
  AMMUNITION: "Ewidencja amunicji",
  WEAPON_ISSUE: "Wydawanie i przyjmowanie broni",
  AMMUNITION_ISSUE: "Wydawanie i przyjmowanie amunicji",
} satisfies Record<BookType, string>;

export const bookStatusLabels = {
  ACTIVE: "Aktywna",
  CLOSED: "Zamknięta",
} satisfies Record<BookStatus, string>;

export const weaponTypeLabels = {
  HANDGUN: "Broń krótka",
  LONG_GUN: "Broń długa",
} satisfies Record<WeaponType, string>;

export const weaponStatusLabels = {
  IN_STORAGE: "W magazynie",
  ISSUED: "Wydana",
  TRANSFERRED: "Przekazana",
  WITHDRAWN: "Wycofana",
  DEREGISTERED: "Zdjęta z ewidencji",
} satisfies Record<WeaponStatus, string>;

export const weaponRegisterEventTypeLabels = {
  ACQUISITION: "Nabycie",
  REGISTRATION: "Zewidencjonowanie",
  TRANSFER: "Przekazanie",
  WITHDRAWAL: "Wycofanie",
  DEREGISTRATION: "Zdjęcie z ewidencji",
  CORRECTION: "Korekta",
} satisfies Record<WeaponRegisterEventType, string>;

export const weaponEventTypeLabels = {
  ACQUIRED: "Nabycie",
  REGISTERED: "Zewidencjonowanie",
  ISSUED: "Wydanie",
  RETURNED: "Zwrot",
  TRANSFERRED: "Przekazanie",
  WITHDRAWN: "Wycofanie",
  DEREGISTERED: "Zdjęcie z ewidencji",
  CORRECTED: "Korekta",
  FLAGGED: "Oznaczenie do kontroli",
  FLAG_RESOLVED: "Zamknięcie kontroli",
} satisfies Record<WeaponEventType, string>;

export const issueStatusLabels = {
  ACTIVE: "Aktywne",
  CLOSED: "Zamknięte",
  CANCELLED_BY_CORRECTION: "Anulowane korektą",
} satisfies Record<IssueStatus, string>;

export const ammoLedgerKindLabels = {
  ACQUISITION: "Nabycie",
  ISSUE: "Wydanie",
  RETURN: "Zwrot",
  CONSUMPTION: "Rozchód",
  CORRECTION: "Korekta",
} satisfies Record<AmmoLedgerKind, string>;

export const ammoIssueEventTypeLabels = {
  ISSUED: "Wydanie",
  RETURNED: "Zwrot",
  CONSUMED: "Rozchód",
  EXTENDED: "Kontynuacja wydania",
  CORRECTED: "Korekta",
} satisfies Record<AmmoIssueEventType, string>;

export const documentTypeLabels = {
  INVOICE: "Faktura",
  AGREEMENT: "Umowa",
  TRANSFER_DOCUMENT: "Dokument przekazania",
  WITHDRAWAL_DOCUMENT: "Dokument wycofania",
  AUTHORIZATION: "Upoważnienie",
  OTHER: "Inny dokument",
} satisfies Record<DocumentType, string>;

export const confirmationMethodLabels = {
  PIN: "PIN użytkownika",
  SYSTEM: "Potwierdzenie systemowe",
} satisfies Record<ConfirmationMethod, string>;

export const backupTypeLabels = {
  AUTO: "Automatyczna",
  MANUAL: "Ręczna",
  PRE_RESTORE: "Przed odtworzeniem",
} satisfies Record<BackupType, string>;

export const backupStatusLabels = {
  PENDING: "W toku",
  SUCCESS: "Poprawna",
  FAILED: "Nieudana",
} satisfies Record<BackupStatus, string>;

export const auditOperationLabels: Readonly<Record<string, string>> = {
  INITIAL_ADMIN_CREATED: "Utworzenie pierwszego administratora",
  PASSWORD_CHANGED: "Zmiana hasła lub PIN-u",
  USER_CREATED: "Utworzenie użytkownika",
  USER_ACTIVATED: "Aktywacja użytkownika",
  USER_DEACTIVATED: "Dezaktywacja użytkownika",
  BOOK_CREATED: "Utworzenie księgi",
  CALIBER_CREATED: "Dodanie kalibru",
  DOCUMENT_CREATED: "Utworzenie dokumentu",
  DOCUMENT_UPDATED: "Aktualizacja dokumentu",
  DOCUMENT_DELETED: "Usunięcie dokumentu",
  ATTACHMENT_ADDED: "Dodanie załącznika",
  ATTACHMENT_DELETED: "Usunięcie załącznika",
  WEAPON_IMAGE_ADDED: "Dodanie zdjęcia broni",
  WEAPON_IMAGE_DELETED: "Usunięcie zdjęcia broni",
  WEAPON_METADATA_UPDATED: "Aktualizacja metadanych broni",
  SETTINGS_UPDATED: "Aktualizacja ustawień",
  PHYSICAL_VERIFICATION_FLAGGED: "Oznaczenie do kontroli fizycznej",
  PHYSICAL_VERIFICATION_RESOLVED: "Zamknięcie kontroli fizycznej",
  BACKUP_CREATED: "Utworzenie kopii zapasowej",
  AMMO_ACQUIRED: "Nabycie amunicji",
  AMMO_ISSUED: "Wydanie amunicji",
  AMMO_RETURNED: "Zwrot amunicji",
  WEAPON_REGISTERED: "Dodanie broni",
  WEAPON_ISSUED: "Wydanie broni",
  WEAPON_RETURNED: "Zwrot broni",
  WEAPON_TRANSFERRED: "Przekazanie broni",
  WEAPON_WITHDRAWN: "Wycofanie broni",
  WEAPON_DEREGISTERED: "Zdjęcie broni z ewidencji",
  REGISTER_ENTRY_CORRECTED: "Korekta wpisu ewidencyjnego",
};

export const auditEntityTypeLabels: Readonly<Record<string, string>> = {
  Attachment: "Załącznik dokumentu",
  User: "Użytkownik",
  RegisterBook: "Księga",
  Caliber: "Kaliber",
  Document: "Dokument",
  SystemSetting: "Ustawienie systemowe",
  PhysicalVerificationFlag: "Kontrola fizyczna",
  WeaponImage: "Zdjęcie broni",
  Weapon: "Broń",
  BackupRecord: "Kopia zapasowa",
  AmmoIssue: "Wydanie amunicji",
  AmmunitionRegisterEntry: "Wpis ewidencji amunicji",
  CorrectionEvent: "Korekta wpisu",
  WeaponIssue: "Wydanie broni",
  WeaponRegisterEntry: "Wpis ewidencji broni",
};

export function labelFor(labels: Readonly<Record<string, string>>, value: string | null | undefined, fallback: string) {
  if (!value) return "—";
  return labels[value] ?? fallback;
}
