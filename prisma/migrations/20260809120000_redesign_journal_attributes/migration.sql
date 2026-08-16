-- DropIndex
DROP INDEX "journal_metrics_journalId_year_key";

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "journal_metrics";
PRAGMA foreign_keys=on;

-- CreateTable
CREATE TABLE "indexing_databases" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "journal_formats" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "journal_indexes" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "fields" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "parentId" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "fields_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "fields" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "journal_indexings" (
    "journalId" TEXT NOT NULL,
    "databaseId" TEXT NOT NULL,

    PRIMARY KEY ("journalId", "databaseId"),
    CONSTRAINT "journal_indexings_journalId_fkey" FOREIGN KEY ("journalId") REFERENCES "journals" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "journal_indexings_databaseId_fkey" FOREIGN KEY ("databaseId") REFERENCES "indexing_databases" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "journal_format_links" (
    "journalId" TEXT NOT NULL,
    "formatId" TEXT NOT NULL,

    PRIMARY KEY ("journalId", "formatId"),
    CONSTRAINT "journal_format_links_journalId_fkey" FOREIGN KEY ("journalId") REFERENCES "journals" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "journal_format_links_formatId_fkey" FOREIGN KEY ("formatId") REFERENCES "journal_formats" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "journal_index_links" (
    "journalId" TEXT NOT NULL,
    "indexId" TEXT NOT NULL,

    PRIMARY KEY ("journalId", "indexId"),
    CONSTRAINT "journal_index_links_journalId_fkey" FOREIGN KEY ("journalId") REFERENCES "journals" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "journal_index_links_indexId_fkey" FOREIGN KEY ("indexId") REFERENCES "journal_indexes" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "journal_fields" (
    "journalId" TEXT NOT NULL,
    "fieldId" TEXT NOT NULL,

    PRIMARY KEY ("journalId", "fieldId"),
    CONSTRAINT "journal_fields_journalId_fkey" FOREIGN KEY ("journalId") REFERENCES "journals" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "journal_fields_fieldId_fkey" FOREIGN KEY ("fieldId") REFERENCES "fields" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Backfill: 期刊名称统一使用中文名 title = titleCn（titleCn 即将删除）
UPDATE "journals" SET "title" = "titleCn" WHERE "titleCn" IS NOT NULL AND "titleCn" <> '';

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
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "journals_publisherId_fkey" FOREIGN KEY ("publisherId") REFERENCES "publishers" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "journals_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_journals" ("auditReason", "createdAt", "createdById", "eissn", "foundedYear", "id", "isOa", "issn", "officialUrl", "publicationFreq", "publishedAt", "publisherId", "slug", "status", "submissionUrl", "title", "updatedAt") SELECT "auditReason", "createdAt", "createdById", "eissn", "foundedYear", "id", "isOa", "issn", "officialUrl", "publicationFreq", "publishedAt", "publisherId", "slug", "status", "submissionUrl", "title", "updatedAt" FROM "journals";
DROP TABLE "journals";
ALTER TABLE "new_journals" RENAME TO "journals";
CREATE UNIQUE INDEX "journals_slug_key" ON "journals"("slug");
CREATE UNIQUE INDEX "journals_issn_key" ON "journals"("issn");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "indexing_databases_name_key" ON "indexing_databases"("name");

-- CreateIndex
CREATE UNIQUE INDEX "indexing_databases_slug_key" ON "indexing_databases"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "journal_formats_name_key" ON "journal_formats"("name");

-- CreateIndex
CREATE UNIQUE INDEX "journal_formats_slug_key" ON "journal_formats"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "journal_indexes_name_key" ON "journal_indexes"("name");

-- CreateIndex
CREATE UNIQUE INDEX "journal_indexes_slug_key" ON "journal_indexes"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "fields_name_key" ON "fields"("name");

-- CreateIndex
CREATE UNIQUE INDEX "fields_slug_key" ON "fields"("slug");
