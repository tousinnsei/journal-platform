import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import { journalSchema, journalAuditSchema, firstErrorMessage } from "@/lib/validators";
import { logAuditAction } from "@/lib/audit";
import { AppError, friendlyError, type FriendlyErrorResult } from "@/lib/errors";
import { validateJournalDictRefs } from "@/lib/journal-dicts";
import {
  adminJournalInclude,
  findOrCreatePublisher,
  resolveJournalDictRefsTx,
} from "@/lib/admin-journal";
import { Role } from "@prisma/client";

function errorJson(error: FriendlyErrorResult) {
  return NextResponse.json(
    { code: error.status, message: error.message, ...(error.code ? { errorCode: error.code } : {}), ...(error.field ? { field: error.field } : {}), ...(error.detail ? { detail: error.detail } : {}) },
    { status: error.status }
  );
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ code: 401, message: "未授权" }, { status: 401 });
  }

  const journal = await db.journal.findUnique({
    where: { id },
    include: adminJournalInclude,
  });

  if (!journal) {
    return NextResponse.json({ code: 404, message: "期刊不存在" }, { status: 404 });
  }

  return NextResponse.json({ code: 200, data: journal });
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ code: 401, message: "未授权" }, { status: 401 });
  }

  const target = await db.journal.findUnique({ where: { id }, select: { id: true, createdById: true } });
  if (!target) {
    return NextResponse.json({ code: 404, message: "期刊不存在" }, { status: 404 });
  }

  // EDITOR can only edit journals they created; SUPER_ADMIN can edit all
  if (user.role !== Role.SUPER_ADMIN && target.createdById !== user.id) {
    return NextResponse.json(
      { code: 403, message: "仅可编辑自己创建的期刊" },
      { status: 403 }
    );
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
    const level = data.journalLevel ?? data.level;
    const coreTypeNames = data.coreType ? [...(data.coreTypes || []), data.coreType] : data.coreTypes || [];

    if (level === "CORE" && coreTypeNames.length === 0 && (data.indexIds?.length ?? 0) === 0) {
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

    // Validate that all referenced dictionary IDs really exist
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

    // Channel prices are managed by the dedicated sources API; the sources
    // array in the journal payload is ignored here to avoid silent overwrites.
    let updatedJournal;
    try {
      updatedJournal = await db.$transaction(async (tx) => {
        // Free-text publisher: reuse by name or auto-create (concurrency-safe).
        const publisher = await findOrCreatePublisher(data.publisherName, tx);

        // Resolve name-based dictionaries plus the legacy ID arrays.
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

        // Duplicate conflict against a *different* journal with same title+publisher.
        const duplicate = await tx.journal.findFirst({
          where: { title: data.title, publisherId: publisher.id, NOT: { id } },
          select: { id: true },
        });
        if (duplicate) {
          throw new AppError("该期刊已经存在，是否进入现有期刊并新增资源渠道？", 409, {
            existingId: duplicate.id,
          });
        }

        await tx.journalCategory.deleteMany({ where: { journalId: id } });
        await tx.journalIndexing.deleteMany({ where: { journalId: id } });
        await tx.journalFormatLink.deleteMany({ where: { journalId: id } });
        await tx.journalIndexLink.deleteMany({ where: { journalId: id } });
        await tx.journalField.deleteMany({ where: { journalId: id } });

        return tx.journal.update({
          where: { id },
          data: {
            title: data.title,
            publisherId: publisher.id,
            description: data.description || null,
            note: data.note || null,
            officialWebsite: data.officialWebsite || null,
            level,
            status: data.status,
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

    await logAuditAction(user.id, "UPDATE_JOURNAL", "journals", id, {
      title: updatedJournal.title,
      publisher: updatedJournal.publisher.name,
      status: updatedJournal.status,
      level: updatedJournal.level,
    });

    return NextResponse.json({ code: 200, message: "期刊更新成功", data: updatedJournal });
  } catch (error: unknown) {
    console.error("Update journal error:", error);
    return errorJson(friendlyError(error, "期刊保存失败，请稍后重试"));
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ code: 401, message: "未授权" }, { status: 401 });
  }

  // Only SUPER_ADMIN can audit and approve/reject
  if (user.role !== Role.SUPER_ADMIN) {
    return NextResponse.json({ code: 403, message: "仅超级管理员可进行审核操作" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const result = journalAuditSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { code: 400, message: firstErrorMessage(result.error) },
        { status: 400 }
      );
    }

    const { status, auditReason } = result.data;

    const auditedJournal = await db.journal.update({
      where: { id },
      data: {
        status,
        auditReason: auditReason || null,
        publishedAt: status === "PUBLISHED" ? new Date() : null,
      },
    });

    await logAuditAction(user.id, `AUDIT_${status}`, "journals", id, {
      status,
      auditReason,
    });

    return NextResponse.json({
      code: 200,
      message: status === "PUBLISHED" ? "期刊已审核通过并发布" : "期刊已被驳回",
      data: auditedJournal,
    });
  } catch (error: unknown) {
    console.error("Audit journal error:", error);
    const { message, status: errorStatus } = friendlyError(error, "审核操作失败，请稍后重试");
    return NextResponse.json({ code: errorStatus, message }, { status: errorStatus });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ code: 401, message: "未授权" }, { status: 401 });
  }

  if (user.role !== Role.SUPER_ADMIN) {
    return NextResponse.json({ code: 403, message: "仅超级管理员有权删除期刊" }, { status: 403 });
  }

  try {
    const existing = await db.journal.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ code: 404, message: "期刊不存在" }, { status: 404 });
    }

    await db.journal.delete({ where: { id } });

    await logAuditAction(user.id, "DELETE_JOURNAL", "journals", id, {
      title: existing.title,
    });

    return NextResponse.json({ code: 200, message: "期刊物理删除成功" });
  } catch (error: unknown) {
    console.error("Delete journal error:", error);
    const { message, status: errorStatus } = friendlyError(error, "期刊删除失败，请稍后重试");
    return NextResponse.json({ code: errorStatus, message }, { status: errorStatus });
  }
}
