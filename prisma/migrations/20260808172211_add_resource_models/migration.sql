-- CreateTable
CREATE TABLE "journal_sources" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "journalId" TEXT NOT NULL,
    "sourceType" TEXT,
    "sourceName" TEXT NOT NULL,
    "contactName" TEXT,
    "contactNickname" TEXT,
    "contactPhone" TEXT,
    "contactWechat" TEXT,
    "contactEmail" TEXT,
    "contactNote" TEXT,
    "costPrice" INTEGER,
    "salePrice" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'CNY',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "journal_sources_journalId_fkey" FOREIGN KEY ("journalId") REFERENCES "journals" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "software_copyrights" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT NOT NULL DEFAULT 'NORMAL',
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "auditReason" TEXT,
    "createdById" TEXT,
    "publishedAt" DATETIME,
    "minCostPrice" INTEGER,
    "minSalePrice" INTEGER,
    "currency" TEXT NOT NULL DEFAULT 'CNY',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "software_copyrights_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "software_copyright_sources" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "copyrightId" TEXT NOT NULL,
    "sourceType" TEXT,
    "sourceName" TEXT NOT NULL,
    "contactName" TEXT,
    "contactNickname" TEXT,
    "contactPhone" TEXT,
    "contactWechat" TEXT,
    "contactEmail" TEXT,
    "contactNote" TEXT,
    "costPrice" INTEGER,
    "salePrice" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'CNY',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "software_copyright_sources_copyrightId_fkey" FOREIGN KEY ("copyrightId") REFERENCES "software_copyrights" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "patents" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT NOT NULL DEFAULT 'INVENTION',
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "auditReason" TEXT,
    "createdById" TEXT,
    "publishedAt" DATETIME,
    "minCostPrice" INTEGER,
    "minSalePrice" INTEGER,
    "currency" TEXT NOT NULL DEFAULT 'CNY',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "patents_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "patent_sources" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "patentId" TEXT NOT NULL,
    "sourceType" TEXT,
    "sourceName" TEXT NOT NULL,
    "contactName" TEXT,
    "contactNickname" TEXT,
    "contactPhone" TEXT,
    "contactWechat" TEXT,
    "contactEmail" TEXT,
    "contactNote" TEXT,
    "costPrice" INTEGER,
    "salePrice" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'CNY',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "patent_sources_patentId_fkey" FOREIGN KEY ("patentId") REFERENCES "patents" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "trademark_services" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "auditReason" TEXT,
    "createdById" TEXT,
    "publishedAt" DATETIME,
    "minCostPrice" INTEGER,
    "minSalePrice" INTEGER,
    "currency" TEXT NOT NULL DEFAULT 'CNY',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "trademark_services_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "trademark_sources" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "serviceId" TEXT NOT NULL,
    "times" INTEGER NOT NULL DEFAULT 1,
    "sourceType" TEXT,
    "sourceName" TEXT NOT NULL,
    "contactName" TEXT,
    "contactNickname" TEXT,
    "contactPhone" TEXT,
    "contactWechat" TEXT,
    "contactEmail" TEXT,
    "contactNote" TEXT,
    "costPrice" INTEGER,
    "salePrice" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'CNY',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "trademark_sources_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "trademark_services" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_journals" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "issn" TEXT NOT NULL,
    "eissn" TEXT,
    "publisherId" TEXT NOT NULL,
    "officialUrl" TEXT NOT NULL,
    "submissionUrl" TEXT,
    "isOa" BOOLEAN NOT NULL DEFAULT false,
    "publicationFreq" TEXT,
    "foundedYear" INTEGER,
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
INSERT INTO "new_journals" ("auditReason", "createdAt", "createdById", "eissn", "foundedYear", "id", "isOa", "issn", "level", "officialUrl", "publicationFreq", "publishedAt", "publisherId", "slug", "status", "submissionUrl", "title", "updatedAt") SELECT "auditReason", "createdAt", "createdById", "eissn", "foundedYear", "id", "isOa", "issn", "level", "officialUrl", "publicationFreq", "publishedAt", "publisherId", "slug", "status", "submissionUrl", "title", "updatedAt" FROM "journals";
DROP TABLE "journals";
ALTER TABLE "new_journals" RENAME TO "journals";
CREATE UNIQUE INDEX "journals_slug_key" ON "journals"("slug");
CREATE UNIQUE INDEX "journals_issn_key" ON "journals"("issn");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
