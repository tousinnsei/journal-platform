import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import { journalSourceSchema, firstErrorMessage } from "@/lib/validators";
import { logAuditAction } from "@/lib/audit";
import { friendlyError } from "@/lib/errors";
import { recomputeJournalPrices } from "@/lib/journal-prices";
import { Role } from "@prisma/client";

async function loadTarget(id: string, user: { id: string; role: string }) {
  const journal = await db.journal.findUnique({
    where: { id },
    select: { id: true, createdById: true },
  });
  if (!journal) {
    return { error: NextResponse.json({ code: 404, message: "期刊不存在" }, { status: 404 }) };
  }
  if (user.role !== Role.SUPER_ADMIN && journal.createdById !== user.id) {
    return {
      error: NextResponse.json(
        { code: 403, message: "仅可编辑自己创建的期刊" },
        { status: 403 }
      ),
    };
  }
  return { journal };
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

  const { error, journal } = await loadTarget(id, user);
  if (error) return error;

  const sources = await db.journalSource.findMany({
    where: { journalId: journal!.id },
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

  const { error, journal } = await loadTarget(id, user);
  if (error) return error;

  try {
    const body = await request.json();
    const parseResult = journalSourceSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { code: 400, message: firstErrorMessage(parseResult.error) },
        { status: 400 }
      );
    }

    const data = parseResult.data;
    const source = await db.journalSource.create({
      data: {
        journalId: journal!.id,
        sourceName: data.sourceName,
        sourceType: data.sourceType || null,
        contactName: data.contactName || null,
        contactNickname: data.contactNickname || null,
        contactPhone: data.contactPhone || null,
        contactWechat: data.contactWechat || null,
        contactEmail: data.contactEmail || null,
        contactNote: data.contactNote || null,
        costPrice: data.costPrice ?? null,
        salePrice: data.salePrice,
        currency: data.currency.toUpperCase(),
        status: data.status,
        sortOrder: data.sortOrder,
      },
    });

    const updated = await recomputeJournalPrices(journal!.id);

    await logAuditAction(user.id, "SOURCE_CREATED", "journals", journal!.id, {
      sourceId: source.id,
      sourceName: source.sourceName,
      costPrice: source.costPrice,
      salePrice: source.salePrice,
      currency: source.currency,
    });

    return NextResponse.json({ code: 200, message: "资源渠道已新增", data: { source, journal: updated } });
  } catch (error: unknown) {
    console.error("Create journal source error:", error);
    const { message, status } = friendlyError(error, "资源渠道保存失败，请稍后重试");
    return NextResponse.json({ code: status, message }, { status });
  }
}
