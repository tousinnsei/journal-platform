import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import { trademarkServiceSchema, firstErrorMessage } from "@/lib/validators";
import { logAuditAction } from "@/lib/audit";
import { pickMinPrices } from "@/lib/journal-prices";
import { Prisma, ResourceStatus } from "@prisma/client";

const trademarkInclude = {
  createdBy: { select: { id: true, name: true } },
  sources: { orderBy: { sortOrder: "asc" } },
} as const;

export async function GET(request: Request) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ code: 401, message: "未授权" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const statusParam = searchParams.get("status");
  const keyword = (searchParams.get("keyword") || "").trim();
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20", 10) || 20));

  const where: Prisma.TrademarkServiceWhereInput = {};
  if (statusParam && ["DRAFT", "PENDING", "PUBLISHED", "REJECTED"].includes(statusParam)) {
    where.status = statusParam as ResourceStatus;
  }
  if (keyword) {
    where.OR = [{ name: { contains: keyword } }, { description: { contains: keyword } }];
  }
  const skip = (page - 1) * limit;

  const [list, total] = await Promise.all([
    db.trademarkService.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: trademarkInclude,
      skip,
      take: limit,
    }),
    db.trademarkService.count({ where }),
  ]);

  return NextResponse.json({ code: 200, data: list, meta: { total, page, limit, keyword } });
}

export async function POST(request: Request) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ code: 401, message: "未授权" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const parseResult = trademarkServiceSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { code: 400, message: firstErrorMessage(parseResult.error) },
        { status: 400 }
      );
    }

    const data = parseResult.data;

    const min = pickMinPrices(
      (data.sources || []).map((s) => ({
        costPrice: s.costPrice ?? null,
        salePrice: s.salePrice,
        currency: s.currency.toUpperCase(),
      }))
    );

    const created = await db.trademarkService.create({
      data: {
        name: data.name,
        description: data.description || null,
        note: data.note || null,
        status: data.status,
        minCostPrice: min.minCostPrice,
        minSalePrice: min.minSalePrice,
        currency: min.currency,
        createdById: user.id,
        sources: {
          create: (data.sources || []).map((s, i) => ({
            sourceName: s.sourceName,
            sourceType: s.sourceType || null,
            contactName: s.contactName || null,
            contactPhone: s.contactPhone || null,
            contactWechat: s.contactWechat || null,
            contactEmail: s.contactEmail || null,
            times: s.times,
            costPrice: s.costPrice ?? null,
            salePrice: s.salePrice,
            currency: s.currency.toUpperCase(),
            status: s.status,
            sortOrder: s.sortOrder || i,
          })),
        },
      },
      include: trademarkInclude,
    });

    await logAuditAction(user.id, "CREATE_TRADEMARK_SERVICE", "trademark_services", created.id, {
      name: created.name,
      status: created.status,
      sources: (data.sources || []).length,
    });

    return NextResponse.json({ code: 200, message: "商标服务创建成功", data: created });
  } catch (error: unknown) {
    console.error("Create trademark service error:", error);
    const message = error instanceof Error ? error.message : "创建失败";
    return NextResponse.json({ code: 500, message }, { status: 500 });
  }
}
