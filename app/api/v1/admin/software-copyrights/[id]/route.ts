import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import { softwareCopyrightSchema, journalAuditSchema, firstErrorMessage } from "@/lib/validators";
import { logAuditAction } from "@/lib/audit";
import { Role } from "@prisma/client";

const copyrightInclude = {
  createdBy: { select: { id: true, name: true } },
  sources: { orderBy: { sortOrder: "asc" } },
} as const;

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ code: 401, message: "未授权" }, { status: 401 });
  }

  const copyright = await db.softwareCopyright.findUnique({
    where: { id },
    include: copyrightInclude,
  });

  if (!copyright) {
    return NextResponse.json({ code: 404, message: "软著不存在" }, { status: 404 });
  }

  return NextResponse.json({ code: 200, data: copyright });
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ code: 401, message: "未授权" }, { status: 401 });
  }

  const target = await db.softwareCopyright.findUnique({ where: { id }, select: { id: true, createdById: true } });
  if (!target) {
    return NextResponse.json({ code: 404, message: "软著不存在" }, { status: 404 });
  }

  if (user.role !== Role.SUPER_ADMIN && target.createdById !== user.id) {
    return NextResponse.json(
      { code: 403, message: "仅可编辑自己创建的软著" },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const parseResult = softwareCopyrightSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { code: 400, message: firstErrorMessage(parseResult.error) },
        { status: 400 }
      );
    }

    const data = parseResult.data;

    // Channel prices are managed by the dedicated sources API; the sources
    // array in the resource payload is ignored here to avoid silent overwrites.
    const updated = await db.softwareCopyright.update({
      where: { id },
      data: {
        name: data.name,
        shortName: data.shortName || null,
        registrationNo: data.registrationNo || null,
        copyrightOwner: data.copyrightOwner || null,
        description: data.description || null,
        note: data.note || null,
        type: data.type,
        status: data.status,
      },
      include: copyrightInclude,
    });

    await logAuditAction(user.id, "UPDATE_SOFTWARE_COPYRIGHT", "software_copyrights", id, {
      name: updated.name,
      type: updated.type,
      status: updated.status,
    });

    return NextResponse.json({ code: 200, message: "软著更新成功", data: updated });
  } catch (error: unknown) {
    console.error("Update software copyright error:", error);
    const message = error instanceof Error ? error.message : "更新失败";
    return NextResponse.json({ code: 500, message }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ code: 401, message: "未授权" }, { status: 401 });
  }

  if (user.role !== Role.SUPER_ADMIN) {
    return NextResponse.json({ code: 403, message: "仅超级管理员可进行审核操作" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const result = journalAuditSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { code: 400, message: firstErrorMessage(result.error) },
        { status: 400 }
      );
    }

    const { status, auditReason } = result.data;

    const audited = await db.softwareCopyright.update({
      where: { id },
      data: {
        status,
        auditReason: auditReason || null,
        publishedAt: status === "PUBLISHED" ? new Date() : null,
      },
    });

    await logAuditAction(user.id, `AUDIT_${status}`, "software_copyrights", id, {
      status,
      auditReason,
    });

    return NextResponse.json({
      code: 200,
      message: status === "PUBLISHED" ? "软著已审核通过并发布" : "软著已被驳回",
      data: audited,
    });
  } catch (error: unknown) {
    console.error("Audit software copyright error:", error);
    const message = error instanceof Error ? error.message : "审核操作失败";
    return NextResponse.json({ code: 500, message }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ code: 401, message: "未授权" }, { status: 401 });
  }

  if (user.role !== Role.SUPER_ADMIN) {
    return NextResponse.json({ code: 403, message: "仅超级管理员有权删除软著" }, { status: 403 });
  }

  try {
    const existing = await db.softwareCopyright.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ code: 404, message: "软著不存在" }, { status: 404 });
    }

    await db.softwareCopyright.delete({ where: { id } });

    await logAuditAction(user.id, "DELETE_SOFTWARE_COPYRIGHT", "software_copyrights", id, {
      name: existing.name,
    });

    return NextResponse.json({ code: 200, message: "软著物理删除成功" });
  } catch (error: unknown) {
    console.error("Delete software copyright error:", error);
    const message = error instanceof Error ? error.message : "删除失败";
    return NextResponse.json({ code: 500, message }, { status: 500 });
  }
}
