import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import { categorySchema, firstErrorMessage } from "@/lib/validators";
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
    return NextResponse.json({ code: 403, message: "仅超级管理员可管理学科分类" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const result = categorySchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { code: 400, message: firstErrorMessage(result.error) },
        { status: 400 }
      );
    }

    const { name, slug, parentId, sortOrder } = result.data;

    // Prevent cyclic parent assignment
    if (parentId === id) {
      return NextResponse.json({ code: 400, message: "不能将自身设为父级分类" }, { status: 400 });
    }

    const existingSlug = await db.category.findFirst({
      where: { slug, NOT: { id } },
    });
    if (existingSlug) {
      return NextResponse.json({ code: 400, message: "分类 Slug 冲突" }, { status: 400 });
    }

    const category = await db.category.update({
      where: { id },
      data: {
        name,
        slug,
        parentId: parentId || null,
        sortOrder,
      },
    });

    await logAuditAction(user.id, "UPDATE_CATEGORY", "categories", id, { name });

    return NextResponse.json({ code: 200, message: "学科分类更新成功", data: category });
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
    return NextResponse.json({ code: 403, message: "仅超级管理员可删除分类" }, { status: 403 });
  }

  try {
    const childCount = await db.category.count({ where: { parentId: id } });
    if (childCount > 0) {
      return NextResponse.json(
        { code: 400, message: `无法删除该分类：包含 ${childCount} 个子分类，请先处理子分类` },
        { status: 400 }
      );
    }

    const journalCount = await db.journalCategory.count({ where: { categoryId: id } });
    if (journalCount > 0) {
      return NextResponse.json(
        { code: 400, message: `无法删除该分类：已有 ${journalCount} 本期刊归属于此分类` },
        { status: 400 }
      );
    }

    await db.category.delete({ where: { id } });
    await logAuditAction(user.id, "DELETE_CATEGORY", "categories", id);

    return NextResponse.json({ code: 200, message: "学科分类删除成功" });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "删除失败";
    return NextResponse.json({ code: 500, message }, { status: 500 });
  }
}
