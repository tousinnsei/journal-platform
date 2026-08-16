-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('SUPER_ADMIN', 'EDITOR', 'USER');

-- CreateEnum
CREATE TYPE "JournalStatus" AS ENUM ('DRAFT', 'PENDING', 'PUBLISHED', 'REJECTED');

-- CreateEnum
CREATE TYPE "JournalLevel" AS ENUM ('ORDINARY', 'CORE');

-- CreateEnum
CREATE TYPE "SourceStatus" AS ENUM ('ACTIVE', 'DISABLED');

-- CreateEnum
CREATE TYPE "CopyrightType" AS ENUM ('URGENT', 'NORMAL');

-- CreateEnum
CREATE TYPE "PatentType" AS ENUM ('INVENTION', 'UTILITY_MODEL', 'DESIGN');

-- CreateEnum
CREATE TYPE "ResourceStatus" AS ENUM ('DRAFT', 'PENDING', 'PUBLISHED', 'REJECTED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'EDITOR',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "publishers" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "country" TEXT,
    "officialWebsite" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "publishers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "parentId" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "journals" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "publisherId" TEXT NOT NULL,
    "description" TEXT,
    "note" TEXT,
    "officialWebsite" TEXT,
    "level" "JournalLevel" NOT NULL DEFAULT 'ORDINARY',
    "status" "JournalStatus" NOT NULL DEFAULT 'DRAFT',
    "auditReason" TEXT,
    "createdById" TEXT,
    "publishedAt" TIMESTAMP(3),
    "minCostPrice" INTEGER,
    "minSalePrice" INTEGER,
    "currency" TEXT NOT NULL DEFAULT 'CNY',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "journals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "journal_categories" (
    "journalId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,

    CONSTRAINT "journal_categories_pkey" PRIMARY KEY ("journalId","categoryId")
);

-- CreateTable
CREATE TABLE "indexing_databases" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "indexing_databases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "journal_formats" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "journal_formats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "journal_indexes" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "journal_indexes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fields" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "parentId" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fields_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "journal_indexings" (
    "journalId" TEXT NOT NULL,
    "databaseId" TEXT NOT NULL,

    CONSTRAINT "journal_indexings_pkey" PRIMARY KEY ("journalId","databaseId")
);

-- CreateTable
CREATE TABLE "journal_format_links" (
    "journalId" TEXT NOT NULL,
    "formatId" TEXT NOT NULL,

    CONSTRAINT "journal_format_links_pkey" PRIMARY KEY ("journalId","formatId")
);

-- CreateTable
CREATE TABLE "journal_index_links" (
    "journalId" TEXT NOT NULL,
    "indexId" TEXT NOT NULL,

    CONSTRAINT "journal_index_links_pkey" PRIMARY KEY ("journalId","indexId")
);

-- CreateTable
CREATE TABLE "journal_fields" (
    "journalId" TEXT NOT NULL,
    "fieldId" TEXT NOT NULL,

    CONSTRAINT "journal_fields_pkey" PRIMARY KEY ("journalId","fieldId")
);

-- CreateTable
CREATE TABLE "journal_sources" (
    "id" TEXT NOT NULL,
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
    "status" "SourceStatus" NOT NULL DEFAULT 'ACTIVE',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "journal_sources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "software_copyrights" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "shortName" TEXT,
    "registrationNo" TEXT,
    "copyrightOwner" TEXT,
    "description" TEXT,
    "note" TEXT,
    "type" "CopyrightType" NOT NULL DEFAULT 'NORMAL',
    "status" "ResourceStatus" NOT NULL DEFAULT 'DRAFT',
    "auditReason" TEXT,
    "createdById" TEXT,
    "publishedAt" TIMESTAMP(3),
    "minCostPrice" INTEGER,
    "minSalePrice" INTEGER,
    "currency" TEXT NOT NULL DEFAULT 'CNY',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "software_copyrights_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "software_copyright_sources" (
    "id" TEXT NOT NULL,
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
    "status" "SourceStatus" NOT NULL DEFAULT 'ACTIVE',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "software_copyright_sources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patents" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "note" TEXT,
    "type" "PatentType" NOT NULL DEFAULT 'INVENTION',
    "status" "ResourceStatus" NOT NULL DEFAULT 'DRAFT',
    "auditReason" TEXT,
    "createdById" TEXT,
    "publishedAt" TIMESTAMP(3),
    "minCostPrice" INTEGER,
    "minSalePrice" INTEGER,
    "currency" TEXT NOT NULL DEFAULT 'CNY',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "patents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patent_sources" (
    "id" TEXT NOT NULL,
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
    "status" "SourceStatus" NOT NULL DEFAULT 'ACTIVE',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "patent_sources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trademark_services" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "note" TEXT,
    "status" "ResourceStatus" NOT NULL DEFAULT 'DRAFT',
    "auditReason" TEXT,
    "createdById" TEXT,
    "publishedAt" TIMESTAMP(3),
    "minCostPrice" INTEGER,
    "minSalePrice" INTEGER,
    "currency" TEXT NOT NULL DEFAULT 'CNY',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "trademark_services_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trademark_sources" (
    "id" TEXT NOT NULL,
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
    "status" "SourceStatus" NOT NULL DEFAULT 'ACTIVE',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "trademark_sources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "targetEntity" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "details" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "import_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "module" TEXT NOT NULL DEFAULT 'JOURNAL',
    "fileName" TEXT NOT NULL,
    "totalRows" INTEGER NOT NULL,
    "successRows" INTEGER NOT NULL,
    "newJournalCount" INTEGER NOT NULL,
    "newSourceCount" INTEGER NOT NULL,
    "mergedCount" INTEGER NOT NULL,
    "skippedCount" INTEGER NOT NULL,
    "errorCount" INTEGER NOT NULL,
    "details" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "import_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

鈹屸攢鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹?鈹?
 Update available 6.19.3 -> 7.9.1                       鈹?鈹?                                                        鈹?鈹
? This is a major update - please follow the guide at    鈹?鈹? https://pris.ly/d/major-version-upgrade                鈹?
鈹?                                                        鈹?鈹? Run the following to update                            鈹
?鈹?   npm i --save-dev prisma@latest                       鈹?鈹?   npm i @prisma/client@latest                          
鈹?鈹斺攢鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹?
-- CreateIndex
CREATE UNIQUE INDEX "publishers_name_key" ON "publishers"("name");

-- CreateIndex
CREATE UNIQUE INDEX "publishers_slug_key" ON "publishers"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "categories_slug_key" ON "categories"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "journals_title_publisherId_key" ON "journals"("title", "publisherId");

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

-- AddForeignKey
ALTER TABLE "categories" ADD CONSTRAINT "categories_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journals" ADD CONSTRAINT "journals_publisherId_fkey" FOREIGN KEY ("publisherId") REFERENCES "publishers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journals" ADD CONSTRAINT "journals_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journal_categories" ADD CONSTRAINT "journal_categories_journalId_fkey" FOREIGN KEY ("journalId") REFERENCES "journals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journal_categories" ADD CONSTRAINT "journal_categories_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fields" ADD CONSTRAINT "fields_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "fields"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journal_indexings" ADD CONSTRAINT "journal_indexings_journalId_fkey" FOREIGN KEY ("journalId") REFERENCES "journals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journal_indexings" ADD CONSTRAINT "journal_indexings_databaseId_fkey" FOREIGN KEY ("databaseId") REFERENCES "indexing_databases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journal_format_links" ADD CONSTRAINT "journal_format_links_journalId_fkey" FOREIGN KEY ("journalId") REFERENCES "journals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journal_format_links" ADD CONSTRAINT "journal_format_links_formatId_fkey" FOREIGN KEY ("formatId") REFERENCES "journal_formats"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journal_index_links" ADD CONSTRAINT "journal_index_links_journalId_fkey" FOREIGN KEY ("journalId") REFERENCES "journals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journal_index_links" ADD CONSTRAINT "journal_index_links_indexId_fkey" FOREIGN KEY ("indexId") REFERENCES "journal_indexes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journal_fields" ADD CONSTRAINT "journal_fields_journalId_fkey" FOREIGN KEY ("journalId") REFERENCES "journals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journal_fields" ADD CONSTRAINT "journal_fields_fieldId_fkey" FOREIGN KEY ("fieldId") REFERENCES "fields"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journal_sources" ADD CONSTRAINT "journal_sources_journalId_fkey" FOREIGN KEY ("journalId") REFERENCES "journals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "software_copyrights" ADD CONSTRAINT "software_copyrights_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "software_copyright_sources" ADD CONSTRAINT "software_copyright_sources_copyrightId_fkey" FOREIGN KEY ("copyrightId") REFERENCES "software_copyrights"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patents" ADD CONSTRAINT "patents_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patent_sources" ADD CONSTRAINT "patent_sources_patentId_fkey" FOREIGN KEY ("patentId") REFERENCES "patents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trademark_services" ADD CONSTRAINT "trademark_services_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trademark_sources" ADD CONSTRAINT "trademark_sources_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "trademark_services"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "import_logs" ADD CONSTRAINT "import_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
