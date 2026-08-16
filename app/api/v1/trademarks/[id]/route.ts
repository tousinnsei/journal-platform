import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { publicTrademarkInclude, toPublicTrademark } from "@/lib/public-resource";
import { ResourceStatus } from "@prisma/client";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const trademark = await db.trademarkService.findFirst({
    where: { id, status: ResourceStatus.PUBLISHED },
    include: publicTrademarkInclude,
  });

  if (!trademark) {
    return NextResponse.json({ code: 404, message: "商标服务不存在或未发布" }, { status: 404 });
  }

  return NextResponse.json({ code: 200, data: toPublicTrademark(trademark) });
}
