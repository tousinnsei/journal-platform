import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { publicTrademarkInclude, toPublicTrademark } from "@/lib/public-resource";
import { ResourceStatus } from "@prisma/client";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const keyword = (searchParams.get("keyword") || "").trim();
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "20", 10) || 20));

  const where = {
    status: ResourceStatus.PUBLISHED,
    ...(keyword
      ? {
          OR: [
            { name: { contains: keyword } },
            { description: { contains: keyword } },
          ],
        }
      : {}),
  };
  const orderBy = { createdAt: "desc" as const };
  const skip = (page - 1) * limit;

  const [list, total] = await Promise.all([
    db.trademarkService.findMany({
      where,
      include: publicTrademarkInclude,
      orderBy,
      skip,
      take: limit,
    }),
    db.trademarkService.count({ where }),
  ]);

  return NextResponse.json({
    code: 200,
    data: list.map(toPublicTrademark),
    meta: { total, page, limit, keyword },
  });
}
