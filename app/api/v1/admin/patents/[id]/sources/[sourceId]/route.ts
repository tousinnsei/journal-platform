import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import { patentSourceSchema, firstErrorMessage } from "@/lib/validators";
import { logAuditAction } from "@/lib/audit";
import { recomputePatentPrices } from "@/lib/journal-prices";
import { Role } from "@prisma/client";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string; sourceId: string }> }
) {
  const { id, sourceId } = await params;
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ code: 401, message: "未授权" }, { status: 401 });
  }

  const patent = await db.patent.findUnique({
    where: { id },
    select: { id: true, createdById: true },
  });
  if (!patent) {
    return NextResponse.json({ code: 404, message: "专利不存在" }, { status: 404 });
  }
  if (user.role !== Role.SUPER_ADMIN && patent.createdById !== user.id) {
    return NextResponse.json(
      { code: 403, message: "仅可编辑自己创建的专利" },
      { status: 403 }
    );
  }

  const existing = await db.patentSource.findUnique({ where: { id: sourceId } });
  if (!existing || existing.patentId !== id) {
    return NextResponse.json({ code: 404, message: "资源渠道不存在" }, { status: 404 });
  }

  try {
    const body = await request.json();
    const parseResult = patentSourceSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { code: 400, message: firstErrorMessage(parseResult.error) },
        { status: 400 }
      );
    }

    const data = parseResult.data;
    const before = { ...existing };

    const source = await db.patentSource.update({
      where: { id: sourceId },
      data: {
        sourceName: data.sourceName,
        sourceType: data.sourceType || null,
        contactName: data.contactName || null,
        contactPhone: data.contactPhone || null,
        contactWechat: data.contactWechat || null,
        contactEmail: data.contactEmail || null,
        costPrice: data.costPrice ?? null,
        salePrice: data.salePrice,
        currency: data.currency.toUpperCase(),
        status: data.status,
        sortOrder: data.sortOrder,
      },
    });

    const updated = await recomputePatentPrices(id);

    await logAuditAction(user.id, "SOURCE_UPDATED", "patents", id, {
      sourceId: source.id,
      sourceName: source.sourceName,
      before: {
        costPrice: before.costPrice,
        salePrice: before.salePrice,
        status: before.status,
      },
      after: {
        costPrice: source.costPrice,
        salePrice: source.salePrice,
        status: source.status,
      },
    });

    return NextResponse.json({ code: 200, message: "资源渠道已更新", data: { source, patent: updated } });
  } catch (error: unknown) {
    console.error("Update patent source error:", error);
    const message = error instanceof Error ? error.message : "更新失败";
    return NextResponse.json({ code: 500, message }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; sourceId: string }> }
) {
  const { id, sourceId } = await params;
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ code: 401, message: "未授权" }, { status: 401 });
  }

  const patent = await db.patent.findUnique({
    where: { id },
    select: { id: true, createdById: true },
  });
  if (!patent) {
    return NextResponse.json({ code: 404, message: "专利不存在" }, { status: 404 });
  }
  if (user.role !== Role.SUPER_ADMIN && patent.createdById !== user.id) {
    return NextResponse.json(
      { code: 403, message: "仅可编辑自己创建的专利" },
      { status: 403 }
    );
  }

  const existing = await db.patentSource.findUnique({ where: { id: sourceId } });
  if (!existing || existing.patentId !== id) {
    return NextResponse.json({ code: 404, message: "资源渠道不存在" }, { status: 404 });
  }

  await db.patentSource.delete({ where: { id: sourceId } });
  const updated = await recomputePatentPrices(id);

  await logAuditAction(user.id, "SOURCE_DELETED", "patents", id, {
    sourceId: existing.id,
    sourceName: existing.sourceName,
  });

  return NextResponse.json({ code: 200, message: "资源渠道已删除", data: { patent: updated } });
}
