-- Serie ksiąg są unikalne w obrębie typu, nie globalnie.
DROP INDEX "RegisterBook_series_key";
CREATE UNIQUE INDEX "uq_books_type_series" ON "RegisterBook"("type", "series");

-- Edytowalne metadane karty broni.
ALTER TABLE "Weapon" ADD COLUMN "displayName" TEXT;

-- Zdjęcia są metadanymi 1:N i nie zmieniają historycznych snapshotów ewidencji.
CREATE TABLE "WeaponImage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "weaponId" TEXT NOT NULL,
    "storageName" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "sha256" TEXT NOT NULL,
    "uploadedById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WeaponImage_weaponId_fkey" FOREIGN KEY ("weaponId") REFERENCES "Weapon" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "WeaponImage_storageName_key" ON "WeaponImage"("storageName");
CREATE INDEX "idx_weapon_images_weapon_date" ON "WeaponImage"("weaponId", "createdAt");
