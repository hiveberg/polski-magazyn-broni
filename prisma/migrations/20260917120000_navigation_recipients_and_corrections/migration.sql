-- Opcjonalny typ broni, ewidencja magazynkow, odbiorcy i materialne korekty amunicji.

ALTER TABLE "Weapon" ADD COLUMN "type_optional" TEXT;
UPDATE "Weapon" SET "type_optional" = "type";
DROP INDEX "idx_weapons_status_type";
ALTER TABLE "Weapon" DROP COLUMN "type";
ALTER TABLE "Weapon" RENAME COLUMN "type_optional" TO "type";
ALTER TABLE "Weapon" ADD COLUMN "magazineCount" INTEGER NOT NULL DEFAULT 0 CHECK ("magazineCount" >= 0);
CREATE INDEX "idx_weapons_status_type" ON "Weapon"("status", "type");

ALTER TABLE "AmmunitionRegisterEntry" ADD COLUMN "ammunitionType_optional" TEXT;
UPDATE "AmmunitionRegisterEntry" SET "ammunitionType_optional" = "ammunitionType";
ALTER TABLE "AmmunitionRegisterEntry" DROP COLUMN "ammunitionType";
ALTER TABLE "AmmunitionRegisterEntry" RENAME COLUMN "ammunitionType_optional" TO "ammunitionType";

CREATE TABLE "Recipient" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "reference" TEXT,
    "normalizedName" TEXT NOT NULL,
    "normalizedReference" TEXT,
    "createdById" TEXT NOT NULL,
    "createdByName" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "idx_recipients_normalized_name" ON "Recipient"("normalizedName");
CREATE INDEX "idx_recipients_normalized_reference" ON "Recipient"("normalizedReference");
CREATE INDEX "idx_recipients_created_at" ON "Recipient"("createdAt");

ALTER TABLE "WeaponIssue" ADD COLUMN "recipientId" TEXT REFERENCES "Recipient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AmmoIssue" ADD COLUMN "recipientId" TEXT REFERENCES "Recipient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "idx_weapon_issues_recipient" ON "WeaponIssue"("recipientId");
CREATE INDEX "idx_ammo_issues_recipient" ON "AmmoIssue"("recipientId");

ALTER TABLE "CorrectionEvent" ADD COLUMN "resultingAmmoEntryId" TEXT REFERENCES "AmmunitionRegisterEntry"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE UNIQUE INDEX "CorrectionEvent_resultingAmmoEntryId_key" ON "CorrectionEvent"("resultingAmmoEntryId");
