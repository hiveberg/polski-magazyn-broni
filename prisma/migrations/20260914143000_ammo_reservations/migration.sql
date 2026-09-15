-- Wydanie rezerwuje amunicję; ewidencyjny rozchód powstaje dopiero przy rozliczeniu.
CREATE TABLE "AmmoIssueAllocation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "issueId" TEXT NOT NULL,
    "bookId" TEXT NOT NULL,
    "caliberId" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL CHECK ("quantity" > 0),
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AmmoIssueAllocation_issueId_fkey" FOREIGN KEY ("issueId") REFERENCES "AmmoIssue" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "AmmoIssueAllocation_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "RegisterBook" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "AmmoIssueAllocation_caliberId_fkey" FOREIGN KEY ("caliberId") REFERENCES "Caliber" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "uq_ammo_issue_allocation_sequence" ON "AmmoIssueAllocation"("issueId", "sequence");
CREATE UNIQUE INDEX "uq_ammo_issue_allocation_book" ON "AmmoIssueAllocation"("issueId", "bookId");
CREATE INDEX "idx_ammo_allocations_book_caliber" ON "AmmoIssueAllocation"("bookId", "caliberId");
CREATE INDEX "idx_ammo_allocations_caliber_issue" ON "AmmoIssueAllocation"("caliberId", "issueId");
