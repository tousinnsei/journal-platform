import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { publicCopyrightInclude, toPublicCopyright } from "@/lib/public-resource";
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
            { shortName: { contains: keyword } },
            { registrationNo: { contains: keyword } },
            { copyrightOwner: { contains: keyword } },
          ],
        }
      : {}),
  };
  const orderBy = { createdAt: "desc" as const };
  const skip = (page - 1) * limit;

  const [list, total] = await Promise.all([
    db.softwareCopyright.findMany({
      where,
      include: publicCopyrightInclude,
      orderBy,
      skip,
      take: limit,
    }),
    db.softwareCopyright.count({ where }),
  ]);

  return NextResponse.json({
    code: 200,
    data: list.map(toPublicCopyright),
    meta: { total, page, limit, keyword },
  });
}
