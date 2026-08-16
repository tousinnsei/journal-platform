import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { publicJournalInclude, toPublicJournal } from "@/lib/public-journal";
import { JournalStatus } from "@prisma/client";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const journal = await db.journal.findFirst({
    where: { id, status: JournalStatus.PUBLISHED },
    include: publicJournalInclude,
  });

  if (!journal) {
    return NextResponse.json({ code: 404, message: "期刊不存在或未发布" }, { status: 404 });
  }

  // Explicit public shape: channel cost prices and contacts are never exposed.
  return NextResponse.json({ code: 200, data: toPublicJournal(journal) });
}
