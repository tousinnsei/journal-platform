-- CreateTable
CREATE TABLE "journal_prices" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "journalId" TEXT NOT NULL,
    "originalPrice" INTEGER,
    "salePrice" INTEGER NOT NULL,
    "currency" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "journal_prices_journalId_fkey" FOREIGN KEY ("journalId") REFERENCES "journals" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "journal_price_histories" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "journalId" TEXT NOT NULL,
    "originalPrice" INTEGER,
    "salePrice" INTEGER NOT NULL,
    "currency" TEXT NOT NULL,
    "changedById" TEXT,
    "changedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "journal_price_histories_journalId_fkey" FOREIGN KEY ("journalId") REFERENCES "journals" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "journal_price_histories_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "journal_prices_journalId_key" ON "journal_prices"("journalId");
