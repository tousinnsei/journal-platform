import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import { publisherSchema, firstErrorMessage } from "@/lib/validators";
import { logAuditAction } from "@/lib/audit";
import { Role } from "@prisma/client";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ code: 401, message: "未授权" }, { status: 401 });
  }
  if (user.role !== Role.SUPER_ADMIN) {
    return NextResponse.json({ code: 403, message: "仅超级管理员可管理出版社" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const result = publisherSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { code: 400, message: firstErrorMessage(result.error) },
        { status: 400 }
      );
    }

    const { name, slug, country, officialWebsite } = result.data;

    const existingSlug = await db.publisher.findFirst({
      where: { slug, NOT: { id } },
    });
    if (existingSlug) {
      return NextResponse.json({ code: 400, message: "Slug 标识与已有出版社冲突" }, { status: 400 });
    }

    const publisher = await db.publisher.update({
      where: { id },
      data: {
        name,
        slug,
        country: country || null,
        officialWebsite: officialWebsite || null,
      },
    });

    await logAuditAction(user.id, "UPDATE_PUBLISHER", "publishers", id, { name });

    return NextResponse.json({ code: 200, message: "出版社更新成功", data: publisher });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "更新失败";
    return NextResponse.json({ code: 500, message }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await getAuthUser();
  if (!user || user.role !== Role.SUPER_ADMIN) {
    return NextResponse.json({ code: 403, message: "仅超级管理员可删除出版社" }, { status: 403 });
  }

  try {
    const journalCount = await db.journal.count({ where: { publisherId: id } });
    if (journalCount > 0) {
      return NextResponse.json(
        { code: 400, message: `无法删除该出版社：已有 ${journalCount} 本期刊关联此出版社` },
        { status: 400 }
      );
    }

    await db.publisher.delete({ where: { id } });
    await logAuditAction(user.id, "DELETE_PUBLISHER", "publishers", id);

    return NextResponse.json({ code: 200, message: "出版社删除成功" });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "删除失败";
    return NextResponse.json({ code: 500, message }, { status: 500 });
  }
}
