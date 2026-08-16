-- AlterTable
ALTER TABLE "patents" ADD COLUMN "note" TEXT;

-- AlterTable
ALTER TABLE "software_copyrights" ADD COLUMN "copyrightOwner" TEXT;
ALTER TABLE "software_copyrights" ADD COLUMN "note" TEXT;
ALTER TABLE "software_copyrights" ADD COLUMN "registrationNo" TEXT;
ALTER TABLE "software_copyrights" ADD COLUMN "shortName" TEXT;

-- AlterTable
ALTER TABLE "trademark_services" ADD COLUMN "note" TEXT;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_journals" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "publisherId" TEXT NOT NULL,
    "description" TEXT,
    "level" TEXT NOT NULL DEFAULT 'ORDINARY',
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "auditReason" TEXT,
    "createdById" TEXT,
    "publishedAt" DATETIME,
    "minCostPrice" INTEGER,
    "minSalePrice" INTEGER,
    "currency" TEXT NOT NULL DEFAULT 'CNY',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "journals_publisherId_fkey" FOREIGN KEY ("publisherId") REFERENCES "publishers" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "journals_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_journals" ("auditReason", "createdAt", "createdById", "currency", "id", "level", "minCostPrice", "minSalePrice", "publishedAt", "publisherId", "status", "title", "updatedAt") SELECT "auditReason", "createdAt", "createdById", "currency", "id", "level", "minCostPrice", "minSalePrice", "publishedAt", "publisherId", "status", "title", "updatedAt" FROM "journals";
DROP TABLE "journals";
ALTER TABLE "new_journals" RENAME TO "journals";
CREATE UNIQUE INDEX "journals_title_publisherId_key" ON "journals"("title", "publisherId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
