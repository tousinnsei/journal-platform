import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { publicPatentInclude, toPublicPatent } from "@/lib/public-resource";
import { ResourceStatus } from "@prisma/client";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const patent = await db.patent.findFirst({
    where: { id, status: ResourceStatus.PUBLISHED },
    include: publicPatentInclude,
  });

  if (!patent) {
    return NextResponse.json({ code: 404, message: "专利不存在或未发布" }, { status: 404 });
  }

  return NextResponse.json({ code: 200, data: toPublicPatent(patent) });
}
