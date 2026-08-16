import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import { publisherSchema, firstErrorMessage } from "@/lib/validators";
import { logAuditAction } from "@/lib/audit";
import { Role } from "@prisma/client";

export async function GET() {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ code: 401, message: "未授权" }, { status: 401 });
  }

  const publishers = await db.publisher.findMany({
    include: { _count: { select: { journals: true } } },
    orderBy: { name: "asc" },
  });

  return NextResponse.json({ code: 200, data: publishers });
}

export async function POST(request: Request) {
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

    const existingName = await db.publisher.findUnique({ where: { name } });
    if (existingName) {
      return NextResponse.json({ code: 400, message: "出版社名称已存在" }, { status: 400 });
    }

    const existingSlug = await db.publisher.findUnique({ where: { slug } });
    if (existingSlug) {
      return NextResponse.json({ code: 400, message: "Slug 标识已被使用" }, { status: 400 });
    }

    const publisher = await db.publisher.create({
      data: {
        name,
        slug,
        country: country || null,
        officialWebsite: officialWebsite || null,
      },
    });

    await logAuditAction(user.id, "CREATE_PUBLISHER", "publishers", publisher.id, { name });

    return NextResponse.json({ code: 200, message: "出版社创建成功", data: publisher });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "创建失败";
    return NextResponse.json({ code: 500, message }, { status: 500 });
  }
}
