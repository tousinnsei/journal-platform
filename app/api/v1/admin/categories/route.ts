import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import { categorySchema, firstErrorMessage } from "@/lib/validators";
import { logAuditAction } from "@/lib/audit";
import { Role } from "@prisma/client";

export async function GET() {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ code: 401, message: "未授权" }, { status: 401 });
  }

  const categories = await db.category.findMany({
    include: {
      parent: true,
      children: true,
      _count: { select: { journals: true } },
    },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });

  return NextResponse.json({ code: 200, data: categories });
}

export async function POST(request: Request) {
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

    const existingSlug = await db.category.findUnique({ where: { slug } });
    if (existingSlug) {
      return NextResponse.json({ code: 400, message: "分类 Slug 标识已存在" }, { status: 400 });
    }

    const category = await db.category.create({
      data: {
        name,
        slug,
        parentId: parentId || null,
        sortOrder,
      },
    });

    await logAuditAction(user.id, "CREATE_CATEGORY", "categories", category.id, { name, slug });

    return NextResponse.json({ code: 200, message: "学科分类创建成功", data: category });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "创建失败";
    return NextResponse.json({ code: 500, message }, { status: 500 });
  }
}
