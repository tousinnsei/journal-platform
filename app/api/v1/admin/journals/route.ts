import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import { journalSchema, firstErrorMessage } from "@/lib/validators";
import { logAuditAction } from "@/lib/audit";
import { AppError, friendlyError, type FriendlyErrorResult } from "@/lib/errors";
import {
  parseJournalFilters,
  buildJournalFilterWhere,
  buildJournalOrderBy,
} from "@/lib/journal-filters";
import { validateJournalDictRefs } from "@/lib/journal-dicts";
import {
  adminJournalInclude,
  findOrCreatePublisher,
  resolveJournalDictRefsTx,
} from "@/lib/admin-journal";
import { pickMinPrices } from "@/lib/journal-prices";
import { Prisma, JournalStatus } from "@prisma/client";

export async function GET(request: Request) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ code: 401, message: "未授权" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const statusParam = searchParams.get("status");
  const filters = parseJournalFilters(searchParams);

  const where: Prisma.JournalWhereInput = {
    ...buildJournalFilterWhere(filters),
  };
  if (statusParam && ["DRAFT", "PENDING", "PUBLISHED", "REJECTED"].includes(statusParam)) {
    where.status = statusParam as JournalStatus;
  }
  const orderBy = buildJournalOrderBy(filters);
  const skip = (filters.page - 1) * filters.limit;

  const [journals, total] = await Promise.all([
    db.journal.findMany({
      where,
      include: adminJournalInclude,
      orderBy,
      skip,
      take: filters.limit,
    }),
    db.journal.count({ where }),
  ]);

  return NextResponse.json({ code: 200, data: journals, meta: { total, page: filters.page, limit: filters.limit, sort: filters.sort } });
}

function errorJson(error: FriendlyErrorResult) {
  return NextResponse.json(
    { code: error.status, message: error.message, ...(error.code ? { errorCode: error.code } : {}), ...(error.field ? { field: error.field } : {}), ...(error.detail ? { detail: error.detail } : {}) },
    { status: error.status }
  );
}

export async function POST(request: Request) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ code: 401, message: "未授权" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const parseResult = journalSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { code: 400, message: firstErrorMessage(parseResult.error) },
        { status: 400 }
      );
    }

    const data = parseResult.data;
    // Support the business aliases journalLevel / coreType used by imports.
    const level = data.journalLevel ?? data.level;
    const coreTypeNames = data.coreType ? [...(data.coreTypes || []), data.coreType] : data.coreTypes || [];

    // 普通期刊允许不填核心类型；核心期刊必须至少选择一种核心类型。
    if (level === "CORE" && (coreTypeNames.length === 0) && (data.indexIds?.length ?? 0) === 0) {
      return NextResponse.json(
        {
          code: 400,
          message: "核心期刊必须选择核心类型（如 EI、北大核心、CSSCI 等）",
          errorCode: "CORE_TYPE_REQUIRED",
          field: "coreTypes",
        },
        { status: 400 }
      );
    }

    // Validate that all referenced dictionary IDs really exist (before any write).
    const dictError = await validateJournalDictRefs({
      categoryIds: data.categoryIds,
      indexingDatabaseIds: data.indexingDatabaseIds,
      formatIds: data.formatIds,
      indexIds: data.indexIds,
      fieldIds: data.fieldIds,
    });
    if (dictError) {
      return NextResponse.json(
        { code: 400, message: dictError, errorCode: "INVALID_DICT_REF", field: "dictionary" },
        { status: 400 }
      );
    }

    const min = pickMinPrices(
      (data.sources || []).map((s) => ({
        costPrice: s.costPrice ?? null,
        salePrice: s.salePrice,
        currency: s.currency.toUpperCase(),
      }))
    );

    // One transaction: free-text publisher -> real Publisher row (reused or
    // auto-created, concurrency-safe) -> dictionary rows (reused or
    // auto-created) -> duplicate check -> journal + channels.
    // Any failure rolls back the whole operation, so we never leave a journal
    // without its channels (or an orphaned partial write).
    let newJournal;
    try {
      newJournal = await db.$transaction(async (tx) => {
        const publisher = await findOrCreatePublisher(data.publisherName, tx);

        // Resolve name-based dictionaries (indexing/formats/coreTypes/fields/
        // categories) plus the legacy ID arrays into final relation IDs.
        const refs = await resolveJournalDictRefsTx(tx, {
          categories: data.categories,
          indexing: data.indexing,
          formats: data.formats,
          coreTypes: coreTypeNames,
          fields: data.fields,
          categoryIds: data.categoryIds,
          indexingDatabaseIds: data.indexingDatabaseIds,
          formatIds: data.formatIds,
          indexIds: data.indexIds,
          fieldIds: data.fieldIds,
        });

        // Duplicate detection: same title + publisher is a 409, never silently
        // re-created. The admin form can jump into the existing journal and add
        // another channel instead.
        const duplicate = await tx.journal.findUnique({
          where: { title_publisherId: { title: data.title, publisherId: publisher.id } },
          select: { id: true },
        });
        if (duplicate) {
          throw new AppError("该期刊已经存在，是否进入现有期刊并新增资源渠道？", 409, {
            existingId: duplicate.id,
          });
        }

        return tx.journal.create({
          data: {
            title: data.title,
            publisherId: publisher.id,
            description: data.description || null,
            note: data.note || null,
            officialWebsite: data.officialWebsite || null,
            level,
            status: data.status,
            minCostPrice: min.minCostPrice,
            minSalePrice: min.minSalePrice,
            currency: min.currency,
            createdById: user.id,
            categories: {
              create: refs.categoryIds.map((catId) => ({
                category: { connect: { id: catId } },
              })),
            },
            indexingDatabases: {
              create: refs.indexingDatabaseIds.map((id) => ({
                database: { connect: { id } },
              })),
            },
            formats: {
              create: refs.formatIds.map((id) => ({
                format: { connect: { id } },
              })),
            },
            indexes: {
              create: refs.indexIds.map((id) => ({
                index: { connect: { id } },
              })),
            },
            fields: {
              create: refs.fieldIds.map((id) => ({
                field: { connect: { id } },
              })),
            },
            sources: {
              create: (data.sources || []).map((s, i) => ({
                sourceName: s.sourceName,
                sourceType: s.sourceType || null,
                contactName: s.contactName || null,
                contactNickname: s.contactNickname || null,
                contactPhone: s.contactPhone || null,
                contactWechat: s.contactWechat || null,
                contactEmail: s.contactEmail || null,
                contactNote: s.contactNote || null,
                costPrice: s.costPrice ?? null,
                salePrice: s.salePrice,
                currency: s.currency.toUpperCase(),
                status: s.status,
                sortOrder: s.sortOrder || i,
              })),
            },
          },
          include: adminJournalInclude,
        });
      });
    } catch (e) {
      if (e instanceof AppError && e.status === 409) {
        return NextResponse.json(
          { code: 409, message: e.message, data: e.data, errorCode: "DUPLICATE_JOURNAL", field: "title" },
          { status: 409 }
        );
      }
      throw e;
    }

    await logAuditAction(user.id, "CREATE_JOURNAL", "journals", newJournal.id, {
      title: newJournal.title,
      publisher: newJournal.publisher.name,
      status: newJournal.status,
      level: newJournal.level,
      sources: (data.sources || []).length,
    });

    return NextResponse.json({ code: 200, message: "期刊创建成功", data: newJournal });
  } catch (error: unknown) {
    console.error("Create journal error:", error);
    // A concurrent identical submission hits the unique (title, publisherId)
    // constraint - report it as the friendly "already exists" message instead
    // of leaking the raw database error.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json(
        { code: 409, message: "该期刊已经存在，请勿重复创建", errorCode: "DUPLICATE_JOURNAL" },
        { status: 409 }
      );
    }
    return errorJson(friendlyError(error, "期刊保存失败，请稍后重试"));
  }
}
