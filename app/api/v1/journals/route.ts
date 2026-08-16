import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { publicJournalInclude, toPublicJournal } from "@/lib/public-journal";
import {
  parseJournalFilters,
  buildJournalFilterWhere,
  buildJournalOrderBy,
} from "@/lib/journal-filters";
import { JournalStatus } from "@prisma/client";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const filters = parseJournalFilters(searchParams);

  const where = {
    status: JournalStatus.PUBLISHED,
    ...buildJournalFilterWhere(filters),
  };
  const orderBy = buildJournalOrderBy(filters);
  const skip = (filters.page - 1) * filters.limit;

  const [journals, total] = await Promise.all([
    db.journal.findMany({
      where,
      include: publicJournalInclude,
      orderBy,
      skip,
      take: filters.limit,
    }),
    db.journal.count({ where }),
  ]);

  // Explicit public shape: originalPrice is never exposed.
  return NextResponse.json({
    code: 200,
    data: journals.map(toPublicJournal),
    meta: { total, page: filters.page, limit: filters.limit, sort: filters.sort },
  });
}
