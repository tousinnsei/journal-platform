import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import { patentSourceSchema, firstErrorMessage } from "@/lib/validators";
import { logAuditAction } from "@/lib/audit";
import { recomputePatentPrices } from "@/lib/journal-prices";
import { Role } from "@prisma/client";

async function loadTarget(id: string, user: { id: string; role: string }) {
  const patent = await db.patent.findUnique({
    where: { id },
    select: { id: true, createdById: true },
  });
  if (!patent) {
    return { error: NextResponse.json({ code: 404, message: "专利不存在" }, { status: 404 }) };
  }
  if (user.role !== Role.SUPER_ADMIN && patent.createdById !== user.id) {
    return {
      error: NextResponse.json(
        { code: 403, message: "仅可编辑自己创建的专利" },
        { status: 403 }
      ),
    };
  }
  return { patent };
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

  const { error, patent } = await loadTarget(id, user);
  if (error) return error;

  const sources = await db.patentSource.findMany({
    where: { patentId: patent!.id },
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

  const { error, patent } = await loadTarget(id, user);
  if (error) return error;

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
    const source = await db.patentSource.create({
      data: {
        patentId: patent!.id,
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

    const updated = await recomputePatentPrices(patent!.id);

    await logAuditAction(user.id, "SOURCE_CREATED", "patents", patent!.id, {
      sourceId: source.id,
      sourceName: source.sourceName,
      costPrice: source.costPrice,
      salePrice: source.salePrice,
      currency: source.currency,
    });

    return NextResponse.json({ code: 200, message: "资源渠道已新增", data: { source, patent: updated } });
  } catch (error: unknown) {
    console.error("Create patent source error:", error);
    const message = error instanceof Error ? error.message : "创建失败";
    return NextResponse.json({ code: 500, message }, { status: 500 });
  }
}
