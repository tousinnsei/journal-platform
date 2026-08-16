import { Prisma, JournalStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { findOrCreateByName } from "@/lib/admin-journal";
import { pickMinPrices } from "@/lib/journal-prices";
import { logAuditAction } from "@/lib/audit";
import { buildImportPreview, type MappingOverride, type RowError } from "./preview";
import type { ImportGroup, ImportSource } from "./preview";

export type ImportDecisionAction = "CREATE" | "MERGE" | "SKIP";

export interface ImportDecision {
  key: string;
  action: ImportDecisionAction;
  existingJournalId?: string;
}

export interface ImportResult {
  fileName: string;
  totalRows: number;
  successRows: number;
  errorRows: number;
  skippedRows: number;
  newJournalCount: number;
  newSourceCount: number;
  mergedCount: number;
  skippedJournalCount: number;
  importLogId: string;
  rowErrors: RowError[];
}

function defaultActionForGroup(group: ImportGroup): ImportDecisionAction {
  if (group.status === "ERROR") return "SKIP";
  if (group.status === "DUPLICATE") {
    // Same title + publisher => almost certainly the same journal (merge).
    // Same title but different publisher => safer to create a new journal and
    // let the admin decide whether to merge explicitly.
    return group.duplicateKind === "exact" ? "MERGE" : "CREATE";
  }
  return "CREATE";
}

async function recomputeJournalPricesTx(tx: Prisma.TransactionClient, journalId: string) {
  const sources = await tx.journalSource.findMany({
    where: { journalId },
    select: { costPrice: true, salePrice: true, currency: true },
  });
  const min = pickMinPrices(sources);
  await tx.journal.update({
    where: { id: journalId },
    data: {
      minCostPrice: min.minCostPrice,
      minSalePrice: min.minSalePrice,
      currency: min.currency,
    },
  });
}

type SourceInput = {
  sourceName: string;
  sourceType: string | null;
  contactName: string | null;
  contactNickname: string | null;
  contactPhone: string | null;
  contactWechat: string | null;
  contactEmail: string | null;
  contactNote: string | null;
  costPrice: number | null;
  salePrice: number;
  currency: string;
  status: "ACTIVE";
  sortOrder: number;
};

function toSourceData(s: ImportSource, sortOrder: number): SourceInput {
  return {
    sourceName: s.sourceName,
    sourceType: s.sourceType ?? null,
    contactName: s.contactName,
    contactNickname: s.contactNickname,
    contactPhone: s.contactPhone,
    contactWechat: s.contactWechat,
    contactEmail: s.contactEmail,
    contactNote: s.sourceNote,
    costPrice: s.costPrice,
    salePrice: s.salePrice ?? 0,
    currency: s.currency,
    status: "ACTIVE",
    sortOrder,
  };
}

function sourceKey(s: { sourceName: string; salePrice: number | null; costPrice: number | null }): string {
  return `${s.sourceName}|${s.salePrice ?? 0}|${s.costPrice ?? ""}`;
}

export async function confirmJournalImport(params: {
  file: ArrayBuffer | Uint8Array;
  fileName: string;
  mapping?: MappingOverride;
  decisions: ImportDecision[];
  status: "DRAFT" | "PENDING" | "PUBLISHED";
  userId: string;
}): Promise<ImportResult> {
  const preview = await buildImportPreview(params.file, params.fileName, params.mapping);
  const decisionMap = new Map(params.decisions.map((d) => [d.key, d]));
  const status = params.status as JournalStatus;

  const stats = await db.$transaction(async (tx) => {
    let newJournalCount = 0;
    let newSourceCount = 0;
    let mergedCount = 0;
    let skippedJournalCount = 0;
    let successRows = 0;
    let skippedRows = 0;

    for (const group of preview.groups) {
      if (group.status === "ERROR") continue;

      const nonErrorRows = group.rows.filter((r) => r.status !== "ERROR").length;
      if (nonErrorRows === 0) continue;

      const decision = decisionMap.get(group.key);
      const action = decision?.action ?? defaultActionForGroup(group);

      if (action === "SKIP") {
        skippedRows += nonErrorRows;
        skippedJournalCount += 1;
        continue;
      }

      const publisher = await findOrCreateByName(tx, "publisher", group.publisher);

      let existing: { id: string } | null = null;
      if (action === "MERGE") {
        if (decision?.existingJournalId) {
          existing = await tx.journal.findUnique({ where: { id: decision.existingJournalId } });
        }
        if (!existing) {
          existing = await tx.journal.findUnique({
            where: { title_publisherId: { title: group.title, publisherId: publisher.id } },
          });
        }
      }
      if (!existing) {
        existing = await tx.journal.findUnique({
          where: { title_publisherId: { title: group.title, publisherId: publisher.id } },
        });
      }

      if (existing) {
        const existingSources = await tx.journalSource.findMany({
          where: { journalId: existing.id },
          select: { sourceName: true, salePrice: true, costPrice: true },
        });
        const existingKeys = new Set(existingSources.map((s) => sourceKey(s)));
        let sortOrder = existingSources.length;
        let created = 0;
        for (const s of group.sources) {
          if (existingKeys.has(sourceKey(s))) continue;
          await tx.journalSource.create({
            data: { ...toSourceData(s, sortOrder), journalId: existing.id },
          });
          existingKeys.add(sourceKey(s));
          sortOrder += 1;
          created += 1;
        }
        if (created > 0) {
          await recomputeJournalPricesTx(tx, existing.id);
        }
        newSourceCount += created;
        mergedCount += 1;
        successRows += nonErrorRows;
        continue;
      }

      const indexingIds = await Promise.all(
        group.indexing.map((name) => findOrCreateByName(tx, "indexingDatabase", name))
      );
      const formatIds = await Promise.all(
        group.formats.map((name) => findOrCreateByName(tx, "journalFormat", name))
      );
      const indexIds = await Promise.all(
        group.coreTypes.map((name) => findOrCreateByName(tx, "journalIndex", name))
      );
      const fieldIds = await Promise.all(
        group.fields.map((name) => findOrCreateByName(tx, "field", name))
      );

      const min = pickMinPrices(
        group.sources.map((s) => ({
          costPrice: s.costPrice,
          salePrice: s.salePrice,
          currency: s.currency,
        }))
      );

      await tx.journal.create({
        data: {
          title: group.title,
          publisherId: publisher.id,
          description: group.description || null,
          note: group.note || null,
          officialWebsite: group.officialWebsite || null,
          level: group.level,
          status,
          minCostPrice: min.minCostPrice,
          minSalePrice: min.minSalePrice,
          currency: min.currency,
          createdById: params.userId,
          indexingDatabases: {
            create: indexingIds.map((d) => ({ database: { connect: { id: d.id } } })),
          },
          formats: {
            create: formatIds.map((f) => ({ format: { connect: { id: f.id } } })),
          },
          indexes: {
            create: indexIds.map((i) => ({ index: { connect: { id: i.id } } })),
          },
          fields: {
            create: fieldIds.map((f) => ({ field: { connect: { id: f.id } } })),
          },
          sources: {
            create: group.sources.map((s, i) => toSourceData(s, i)) as Prisma.JournalSourceUncheckedCreateWithoutJournalInput[],
          },
        },
      });

      newJournalCount += 1;
      newSourceCount += group.sources.length;
      successRows += nonErrorRows;
    }

    return {
      newJournalCount,
      newSourceCount,
      mergedCount,
      skippedJournalCount,
      successRows,
      skippedRows,
    };
  });

  const importLog = await db.importLog.create({
    data: {
      userId: params.userId,
      module: "JOURNAL",
      fileName: params.fileName,
      totalRows: preview.totalRows,
      successRows: stats.successRows,
      newJournalCount: stats.newJournalCount,
      newSourceCount: stats.newSourceCount,
      mergedCount: stats.mergedCount,
      skippedCount: stats.skippedRows,
      errorCount: preview.errorRows,
      details: JSON.stringify({
        errorRows: preview.rowErrors.slice(0, 200),
      }),
    },
  });

  await logAuditAction(params.userId, "IMPORT_JOURNALS", "journals", importLog.id, {
    fileName: params.fileName,
    totalRows: preview.totalRows,
    successRows: stats.successRows,
    newJournalCount: stats.newJournalCount,
    newSourceCount: stats.newSourceCount,
    mergedCount: stats.mergedCount,
    skippedJournalCount: stats.skippedJournalCount,
    skippedRows: stats.skippedRows,
    errorRows: preview.errorRows,
  });

  return {
    fileName: params.fileName,
    totalRows: preview.totalRows,
    successRows: stats.successRows,
    errorRows: preview.errorRows,
    skippedRows: stats.skippedRows,
    newJournalCount: stats.newJournalCount,
    newSourceCount: stats.newSourceCount,
    mergedCount: stats.mergedCount,
    skippedJournalCount: stats.skippedJournalCount,
    importLogId: importLog.id,
    rowErrors: preview.rowErrors,
  };
}
