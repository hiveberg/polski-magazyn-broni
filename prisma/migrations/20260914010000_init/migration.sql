-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "login" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "pinHash" TEXT,
    "role" TEXT NOT NULL DEFAULT 'AUTHORIZED',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "isAuthorized" BOOLEAN NOT NULL DEFAULT false,
    "forcePasswordChange" BOOLEAN NOT NULL DEFAULT true,
    "isBootstrap" BOOLEAN NOT NULL DEFAULT false,
    "pinFailedAttempts" INTEGER NOT NULL DEFAULT 0,
    "pinLockedUntil" DATETIME,
    "lastLoginAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "UserAuthorization" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "documentId" TEXT,
    "grantedAt" DATETIME NOT NULL,
    "expiresAt" DATETIME,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "UserAuthorization_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "UserAuthorization_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ipHash" TEXT,
    "userAgent" TEXT,
    CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RegisterBook" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "series" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "nextPosition" INTEGER NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" DATETIME
);

-- CreateTable
CREATE TABLE "Caliber" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "canonicalName" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "source" TEXT,
    "sourceId" TEXT,
    "cartridgeType" TEXT,
    "metadata" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "CaliberAlias" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "caliberId" TEXT NOT NULL,
    "alias" TEXT NOT NULL,
    "normalized" TEXT NOT NULL,
    CONSTRAINT "CaliberAlias_caliberId_fkey" FOREIGN KEY ("caliberId") REFERENCES "Caliber" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Document" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "number" TEXT,
    "documentDate" DATETIME NOT NULL,
    "description" TEXT NOT NULL,
    "parties" TEXT,
    "createdById" TEXT NOT NULL,
    "createdByName" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Attachment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "documentId" TEXT,
    "storageName" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "sha256" TEXT NOT NULL,
    "uploadedById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Attachment_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Weapon" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "bookId" TEXT NOT NULL,
    "positionNo" INTEGER NOT NULL,
    "registryRef" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "brand" TEXT NOT NULL,
    "caliberId" TEXT NOT NULL,
    "productionYear" INTEGER,
    "weaponSeries" TEXT,
    "serialNumber" TEXT NOT NULL,
    "otherIdentifyingMarks" TEXT,
    "accessories" TEXT,
    "type" TEXT NOT NULL,
    "photoAttachmentId" TEXT,
    "acquisitionBasis" TEXT NOT NULL,
    "acquisitionDate" DATETIME,
    "registeredAt" DATETIME NOT NULL,
    "certificateNumber" TEXT,
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'IN_STORAGE',
    "acquisitionDocumentId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Weapon_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "RegisterBook" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Weapon_caliberId_fkey" FOREIGN KEY ("caliberId") REFERENCES "Caliber" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Weapon_acquisitionDocumentId_fkey" FOREIGN KEY ("acquisitionDocumentId") REFERENCES "Document" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "WeaponRegisterEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "weaponId" TEXT NOT NULL,
    "bookId" TEXT NOT NULL,
    "positionNo" INTEGER NOT NULL,
    "registryRef" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "effectiveAt" DATETIME NOT NULL,
    "snapshot" JSONB NOT NULL,
    "basis" TEXT NOT NULL,
    "documentId" TEXT,
    "createdById" TEXT NOT NULL,
    "createdByName" TEXT NOT NULL,
    "confirmedById" TEXT,
    "confirmedAt" DATETIME,
    "confirmationMethod" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WeaponRegisterEntry_weaponId_fkey" FOREIGN KEY ("weaponId") REFERENCES "Weapon" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "WeaponRegisterEntry_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "RegisterBook" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "WeaponRegisterEntry_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "WeaponEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "weaponId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "effectiveAt" DATETIME NOT NULL,
    "snapshot" JSONB NOT NULL,
    "basis" TEXT,
    "documentId" TEXT,
    "performedById" TEXT NOT NULL,
    "performedByName" TEXT NOT NULL,
    "confirmedById" TEXT,
    "confirmedAt" DATETIME,
    "confirmationMethod" TEXT,
    "relatedEntityType" TEXT,
    "relatedEntityId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WeaponEvent_weaponId_fkey" FOREIGN KEY ("weaponId") REFERENCES "Weapon" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "WeaponEvent_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "WeaponIssue" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "bookId" TEXT NOT NULL,
    "positionNo" INTEGER NOT NULL,
    "registryRef" TEXT NOT NULL,
    "weaponId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "recipientName" TEXT NOT NULL,
    "recipientReference" TEXT,
    "magazineCount" INTEGER NOT NULL,
    "issuedAt" DATETIME NOT NULL,
    "issuedById" TEXT NOT NULL,
    "issuedByName" TEXT NOT NULL,
    "issueConfirmedById" TEXT NOT NULL,
    "issueConfirmedAt" DATETIME NOT NULL,
    "returnedAt" DATETIME,
    "returnedById" TEXT,
    "returnedByName" TEXT,
    "returnedFromName" TEXT,
    "returnConfirmedById" TEXT,
    "returnConfirmedAt" DATETIME,
    "weaponNameSnapshot" TEXT NOT NULL,
    "weaponBrandSnapshot" TEXT NOT NULL,
    "caliberSnapshot" TEXT NOT NULL,
    "productionYearSnapshot" INTEGER,
    "weaponSeriesSnapshot" TEXT,
    "serialNumberSnapshot" TEXT NOT NULL,
    "certificateSnapshot" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WeaponIssue_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "RegisterBook" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "WeaponIssue_weaponId_fkey" FOREIGN KEY ("weaponId") REFERENCES "Weapon" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AmmunitionRegisterEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "bookId" TEXT NOT NULL,
    "positionNo" INTEGER NOT NULL,
    "registryRef" TEXT NOT NULL,
    "caliberId" TEXT NOT NULL,
    "ammunitionType" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "basis" TEXT NOT NULL,
    "documentId" TEXT,
    "quantityIn" INTEGER NOT NULL DEFAULT 0,
    "quantityOut" INTEGER NOT NULL DEFAULT 0,
    "balanceAfter" INTEGER NOT NULL,
    "issueId" TEXT,
    "effectiveAt" DATETIME NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdByName" TEXT NOT NULL,
    "confirmedById" TEXT,
    "confirmedAt" DATETIME,
    "confirmationMethod" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AmmunitionRegisterEntry_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "RegisterBook" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "AmmunitionRegisterEntry_caliberId_fkey" FOREIGN KEY ("caliberId") REFERENCES "Caliber" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "AmmunitionRegisterEntry_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "AmmunitionRegisterEntry_issueId_fkey" FOREIGN KEY ("issueId") REFERENCES "AmmoIssue" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AmmoIssue" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "bookId" TEXT NOT NULL,
    "sourceBookId" TEXT NOT NULL,
    "positionNo" INTEGER NOT NULL,
    "registryRef" TEXT NOT NULL,
    "caliberId" TEXT NOT NULL,
    "ammunitionType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "recipientName" TEXT NOT NULL,
    "recipientReference" TEXT,
    "quantityIssued" INTEGER NOT NULL,
    "quantityReturned" INTEGER NOT NULL DEFAULT 0,
    "quantityConsumed" INTEGER,
    "issuedAt" DATETIME NOT NULL,
    "issuedById" TEXT NOT NULL,
    "issuedByName" TEXT NOT NULL,
    "issueConfirmedById" TEXT NOT NULL,
    "issueConfirmedAt" DATETIME NOT NULL,
    "closedAt" DATETIME,
    "closedById" TEXT,
    "closedByName" TEXT,
    "returnConfirmedById" TEXT,
    "returnConfirmedAt" DATETIME,
    "weaponIssueId" TEXT,
    "parentIssueId" TEXT,
    "caliberSnapshot" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AmmoIssue_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "RegisterBook" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "AmmoIssue_sourceBookId_fkey" FOREIGN KEY ("sourceBookId") REFERENCES "RegisterBook" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "AmmoIssue_caliberId_fkey" FOREIGN KEY ("caliberId") REFERENCES "Caliber" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "AmmoIssue_weaponIssueId_fkey" FOREIGN KEY ("weaponIssueId") REFERENCES "WeaponIssue" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "AmmoIssue_parentIssueId_fkey" FOREIGN KEY ("parentIssueId") REFERENCES "AmmoIssue" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AmmoIssueEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "issueId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "quantity" INTEGER,
    "effectiveAt" DATETIME NOT NULL,
    "performedById" TEXT NOT NULL,
    "performedByName" TEXT NOT NULL,
    "confirmedById" TEXT,
    "confirmedAt" DATETIME,
    "details" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AmmoIssueEvent_issueId_fkey" FOREIGN KEY ("issueId") REFERENCES "AmmoIssue" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CorrectionEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "correctsWeaponEntryId" TEXT,
    "correctsAmmoEntryId" TEXT,
    "previousSnapshot" JSONB NOT NULL,
    "correctedValues" JSONB NOT NULL,
    "reason" TEXT NOT NULL,
    "correctedById" TEXT NOT NULL,
    "correctedByName" TEXT NOT NULL,
    "correctedAt" DATETIME NOT NULL,
    "confirmedById" TEXT NOT NULL,
    "confirmationMethod" TEXT NOT NULL DEFAULT 'PIN',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CorrectionEvent_correctsWeaponEntryId_fkey" FOREIGN KEY ("correctsWeaponEntryId") REFERENCES "WeaponRegisterEntry" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "CorrectionEvent_correctsAmmoEntryId_fkey" FOREIGN KEY ("correctsAmmoEntryId") REFERENCES "AmmunitionRegisterEntry" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AuditEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sequence" INTEGER NOT NULL,
    "timestamp" DATETIME NOT NULL,
    "userId" TEXT,
    "userSnapshot" TEXT,
    "operation" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "payload" JSONB NOT NULL,
    "payloadHash" TEXT NOT NULL,
    "previousAuditHash" TEXT,
    "auditHash" TEXT NOT NULL,
    "sessionId" TEXT,
    "requestMetadata" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "SecurityEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT,
    "login" TEXT,
    "type" TEXT NOT NULL,
    "success" BOOLEAN NOT NULL,
    "details" JSONB
);

-- CreateTable
CREATE TABLE "BackupRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "initiatedById" TEXT,
    "initiatedByName" TEXT,
    "filename" TEXT NOT NULL,
    "logicalPath" TEXT NOT NULL,
    "appVersion" TEXT NOT NULL,
    "schemaVersion" TEXT NOT NULL,
    "sha256" TEXT,
    "auditHeadHash" TEXT,
    "recordCounts" JSONB,
    "errorMessage" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" DATETIME
);

-- CreateTable
CREATE TABLE "PhysicalVerificationFlag" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "weaponId" TEXT,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT NOT NULL,
    "createdByName" TEXT NOT NULL,
    "resolvedAt" DATETIME,
    "resolvedById" TEXT,
    "resolvedByName" TEXT,
    CONSTRAINT "PhysicalVerificationFlag_weaponId_fkey" FOREIGN KEY ("weaponId") REFERENCES "Weapon" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SystemSetting" (
    "key" TEXT NOT NULL PRIMARY KEY,
    "value" JSONB NOT NULL,
    "updatedAt" DATETIME NOT NULL,
    "updatedById" TEXT
);

-- CreateIndex
CREATE UNIQUE INDEX "User_login_key" ON "User"("login");

-- CreateIndex
CREATE INDEX "idx_users_active_role" ON "User"("active", "role");

-- CreateIndex
CREATE UNIQUE INDEX "UserAuthorization_userId_key" ON "UserAuthorization"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_tokenHash_key" ON "Session"("tokenHash");

-- CreateIndex
CREATE INDEX "idx_sessions_user_expires" ON "Session"("userId", "expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "RegisterBook_series_key" ON "RegisterBook"("series");

-- CreateIndex
CREATE INDEX "idx_books_type_status" ON "RegisterBook"("type", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Caliber_canonicalName_key" ON "Caliber"("canonicalName");

-- CreateIndex
CREATE INDEX "idx_calibers_active_name" ON "Caliber"("active", "canonicalName");

-- CreateIndex
CREATE UNIQUE INDEX "CaliberAlias_normalized_key" ON "CaliberAlias"("normalized");

-- CreateIndex
CREATE INDEX "idx_caliber_aliases_caliber" ON "CaliberAlias"("caliberId");

-- CreateIndex
CREATE INDEX "idx_documents_type_date" ON "Document"("type", "documentDate");

-- CreateIndex
CREATE UNIQUE INDEX "Attachment_storageName_key" ON "Attachment"("storageName");

-- CreateIndex
CREATE INDEX "idx_attachments_document" ON "Attachment"("documentId");

-- CreateIndex
CREATE UNIQUE INDEX "Weapon_registryRef_key" ON "Weapon"("registryRef");

-- CreateIndex
CREATE INDEX "idx_weapons_serial" ON "Weapon"("serialNumber");

-- CreateIndex
CREATE INDEX "idx_weapons_caliber_status" ON "Weapon"("caliberId", "status");

-- CreateIndex
CREATE INDEX "idx_weapons_status_type" ON "Weapon"("status", "type");

-- CreateIndex
CREATE UNIQUE INDEX "uq_weapon_book_position" ON "Weapon"("bookId", "positionNo");

-- CreateIndex
CREATE INDEX "idx_weapon_entries_book_position" ON "WeaponRegisterEntry"("bookId", "positionNo");

-- CreateIndex
CREATE INDEX "idx_weapon_entries_weapon_date" ON "WeaponRegisterEntry"("weaponId", "effectiveAt");

-- CreateIndex
CREATE INDEX "idx_weapon_events_weapon_date" ON "WeaponEvent"("weaponId", "effectiveAt");

-- CreateIndex
CREATE UNIQUE INDEX "WeaponIssue_registryRef_key" ON "WeaponIssue"("registryRef");

-- CreateIndex
CREATE INDEX "idx_weapon_issues_weapon_status" ON "WeaponIssue"("weaponId", "status");

-- CreateIndex
CREATE INDEX "idx_weapon_issues_status_date" ON "WeaponIssue"("status", "issuedAt");

-- CreateIndex
CREATE UNIQUE INDEX "uq_weapon_issue_book_position" ON "WeaponIssue"("bookId", "positionNo");

-- CreateIndex
CREATE UNIQUE INDEX "AmmunitionRegisterEntry_registryRef_key" ON "AmmunitionRegisterEntry"("registryRef");

-- CreateIndex
CREATE INDEX "idx_ammo_entries_book_caliber_date" ON "AmmunitionRegisterEntry"("bookId", "caliberId", "effectiveAt");

-- CreateIndex
CREATE INDEX "idx_ammo_entries_caliber_date" ON "AmmunitionRegisterEntry"("caliberId", "effectiveAt");

-- CreateIndex
CREATE UNIQUE INDEX "uq_ammo_entry_book_position" ON "AmmunitionRegisterEntry"("bookId", "positionNo");

-- CreateIndex
CREATE UNIQUE INDEX "AmmoIssue_registryRef_key" ON "AmmoIssue"("registryRef");

-- CreateIndex
CREATE INDEX "idx_ammo_issues_status_date" ON "AmmoIssue"("status", "issuedAt");

-- CreateIndex
CREATE INDEX "idx_ammo_issues_caliber_status" ON "AmmoIssue"("caliberId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "uq_ammo_issue_book_position" ON "AmmoIssue"("bookId", "positionNo");

-- CreateIndex
CREATE INDEX "idx_ammo_issue_events_issue_date" ON "AmmoIssueEvent"("issueId", "effectiveAt");

-- CreateIndex
CREATE INDEX "idx_corrections_entity" ON "CorrectionEvent"("entityType", "entityId");

-- CreateIndex
CREATE UNIQUE INDEX "AuditEvent_sequence_key" ON "AuditEvent"("sequence");

-- CreateIndex
CREATE UNIQUE INDEX "AuditEvent_auditHash_key" ON "AuditEvent"("auditHash");

-- CreateIndex
CREATE INDEX "idx_audit_timestamp" ON "AuditEvent"("timestamp");

-- CreateIndex
CREATE INDEX "idx_audit_entity" ON "AuditEvent"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "idx_security_timestamp_type" ON "SecurityEvent"("timestamp", "type");

-- CreateIndex
CREATE INDEX "idx_backups_status_date" ON "BackupRecord"("status", "createdAt");

-- CreateIndex
CREATE INDEX "idx_verification_open_type" ON "PhysicalVerificationFlag"("resolvedAt", "entityType");
