import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { publicCopyrightInclude, toPublicCopyright } from "@/lib/public-resource";
import { ResourceStatus } from "@prisma/client";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const copyright = await db.softwareCopyright.findFirst({
    where: { id, status: ResourceStatus.PUBLISHED },
    include: publicCopyrightInclude,
  });

  if (!copyright) {
    return NextResponse.json({ code: 404, message: "软著不存在或未发布" }, { status: 404 });
  }

  return NextResponse.json({ code: 200, data: toPublicCopyright(copyright) });
}
