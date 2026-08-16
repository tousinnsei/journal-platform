import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import { softwareCopyrightSourceSchema, firstErrorMessage } from "@/lib/validators";
import { logAuditAction } from "@/lib/audit";
import { recomputeCopyrightPrices } from "@/lib/journal-prices";
import { Role } from "@prisma/client";

async function loadTarget(id: string, user: { id: string; role: string }) {
  const copyright = await db.softwareCopyright.findUnique({
    where: { id },
    select: { id: true, createdById: true },
  });
  if (!copyright) {
    return { error: NextResponse.json({ code: 404, message: "软著不存在" }, { status: 404 }) };
  }
  if (user.role !== Role.SUPER_ADMIN && copyright.createdById !== user.id) {
    return {
      error: NextResponse.json(
        { code: 403, message: "仅可编辑自己创建的软著" },
        { status: 403 }
      ),
    };
  }
  return { copyright };
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

  const { error, copyright } = await loadTarget(id, user);
  if (error) return error;

  const sources = await db.softwareCopyrightSource.findMany({
    where: { copyrightId: copyright!.id },
    orderBy: { sortOrder: "asc" },
  });

  return NextResponse.json({ code: 200, data: sources });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ code: 401, message: "未授权" }, { status: 401 });
  }

  const { error, copyright } = await loadTarget(id, user);
  if (error) return error;

  try {
    const body = await request.json();
    const parseResult = softwareCopyrightSourceSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { code: 400, message: firstErrorMessage(parseResult.error) },
        { status: 400 }
      );
    }

    const data = parseResult.data;
    const source = await db.softwareCopyrightSource.create({
      data: {
        copyrightId: copyright!.id,
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

    const updated = await recomputeCopyrightPrices(copyright!.id);

    await logAuditAction(user.id, "SOURCE_CREATED", "software_copyrights", copyright!.id, {
      sourceId: source.id,
      sourceName: source.sourceName,
      costPrice: source.costPrice,
      salePrice: source.salePrice,
      currency: source.currency,
    });

    return NextResponse.json({ code: 200, message: "资源渠道已新增", data: { source, copyright: updated } });
  } catch (error: unknown) {
    console.error("Create copyright source error:", error);
    const message = error instanceof Error ? error.message : "创建失败";
    return NextResponse.json({ code: 500, message }, { status: 500 });
  }
}
