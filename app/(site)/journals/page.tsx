import Link from "next/link";
import { db } from "@/lib/db";
import { publicJournalInclude, toPublicJournal } from "@/lib/public-journal";
import { formatPrice } from "@/lib/price";
import {
  parseJournalFilters,
  buildJournalFilterWhere,
  buildJournalOrderBy,
} from "@/lib/journal-filters";
import { JournalStatus } from "@prisma/client";
import { PublicJournalFilters } from "./public-journal-filters";
import { BadgeDollarSign } from "lucide-react";

export const dynamic = "force-dynamic";

function toSearchParams(sp: Record<string, string | string[] | undefined>): URLSearchParams {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) {
    if (Array.isArray(v)) {
      for (const item of v) params.append(k, item);
    } else if (v) {
      params.set(k, v);
    }
  }
  return params;
}

function pageHref(params: URLSearchParams, page: number): string {
  const p = new URLSearchParams(params);
  p.set("page", String(page));
  return `/journals?${p.toString()}`;
}

export default async function PublicJournalsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const params = toSearchParams(sp);
  const filters = parseJournalFilters(params);

  const where = {
    status: JournalStatus.PUBLISHED,
    ...buildJournalFilterWhere(filters),
  };
  const orderBy = buildJournalOrderBy(filters);

  const [journals, total, publishers, indexingDatabases, formats, indexes, fields] =
    await Promise.all([
      db.journal.findMany({
        where,
        include: publicJournalInclude,
        orderBy,
        skip: (filters.page - 1) * filters.limit,
        take: filters.limit,
      }),
      db.journal.count({ where }),
      db.publisher.findMany({
        orderBy: { name: "asc" },
        select: { id: true, name: true, slug: true },
      }),
      db.indexingDatabase.findMany({
        orderBy: { sortOrder: "asc" },
        select: { id: true, name: true, slug: true },
      }),
      db.journalFormat.findMany({
        orderBy: { sortOrder: "asc" },
        select: { id: true, name: true, slug: true },
      }),
      db.journalIndex.findMany({
        orderBy: { sortOrder: "asc" },
        select: { id: true, name: true, slug: true },
      }),
      db.field.findMany({
        orderBy: { sortOrder: "asc" },
        select: { id: true, name: true, slug: true },
      }),
    ]);

  const list = journals.map(toPublicJournal);
  const totalPages = Math.max(1, Math.ceil(total / filters.limit));

  return (
    <div className="space-y-8">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-white tracking-tight">期刊目录</h1>
        <p className="text-slate-400 text-sm">
          已收录并发布的学术期刊，价格信息来自数据库实时数据。
        </p>
      </div>

      <PublicJournalFilters
        current={{
          keyword: filters.keyword ?? "",
          publisher: filters.publisher ?? "",
          indexing: filters.indexing ? filters.indexing.split(",") : [],
          format: filters.format ? filters.format.split(",") : [],
          level: filters.level ?? "",
          index: filters.index ? filters.index.split(",") : [],
          field: filters.field ? filters.field.split(",") : [],
          priceMin: filters.priceMin != null ? String(filters.priceMin) : "",
          priceMax: filters.priceMax != null ? String(filters.priceMax) : "",
          sort: filters.sort,
        }}
        publishers={publishers}
        indexingDatabases={indexingDatabases}
        formats={formats}
        indexes={indexes}
        fields={fields}
        count={list.length}
        total={total}
      />

      {list.length === 0 ? (
        <div className="p-12 text-center text-slate-500 text-sm bg-slate-900/50 border border-slate-800 rounded-2xl">
          没有符合条件的期刊，请调整筛选条件。
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {list.map((j) => (
            <Link
              key={j.id}
              href={`/journals/${j.id}`}
              className="group bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-3 hover:border-blue-500/50 transition-all"
            >
              <div className="min-h-[60px]">
                <div className="flex items-start justify-between gap-2">
                  <h2 className="font-semibold text-white group-hover:text-blue-400 transition-colors leading-snug">
                    {j.title}
                  </h2>
                  <span
                    className={`shrink-0 px-2 py-0.5 rounded text-[10px] font-semibold border ${
                      j.level === "CORE"
                        ? "bg-amber-950 text-amber-400 border-amber-800/60"
                        : "bg-slate-950 text-slate-400 border-slate-800"
                    }`}
                  >
                    {j.level === "CORE" ? "核心" : "普通"}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs">
                <span className="px-2 py-0.5 rounded bg-blue-950 text-blue-400 border border-blue-800/60">
                  {j.publisher?.name ?? "未知出版社"}
                </span>
                {j.indexingDatabases.slice(0, 2).map((d) => (
                  <span
                    key={d.id}
                    className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800/60"
                  >
                    {d.name}
                  </span>
                ))}
                {j.indexes.slice(0, 2).map((i) => (
                  <span
                    key={i.id}
                    className="px-2 py-0.5 rounded bg-indigo-950 text-indigo-400 border border-indigo-800/60"
                  >
                    {i.name}
                  </span>
                ))}
              </div>

              <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs text-slate-400">
                  <BadgeDollarSign className="w-4 h-4 text-emerald-400" />
                  <span>代理价格</span>
                </div>
                {j.minSalePrice != null ? (
                  <span className="text-sm font-bold text-emerald-400">
                    {formatPrice(j.minSalePrice, j.currency)}{" "}
                    <span className="text-xs font-normal text-slate-400">{j.currency}</span>
                  </span>
                ) : (
                  <span className="text-xs text-slate-500">暂无报价</span>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 text-xs">
          <Link
            href={pageHref(params, Math.max(1, filters.page - 1))}
            aria-disabled={filters.page <= 1}
            className={`px-3 py-1.5 rounded-lg border border-slate-800 bg-slate-900/60 text-slate-300 ${
              filters.page <= 1 ? "opacity-40 pointer-events-none" : "hover:border-blue-500/50"
            }`}
          >
            上一页
          </Link>
          <span className="px-3 py-1.5 text-slate-400">
            第 {filters.page} / {totalPages} 页 · 共 {total} 条
          </span>
          <Link
            href={pageHref(params, Math.min(totalPages, filters.page + 1))}
            aria-disabled={filters.page >= totalPages}
            className={`px-3 py-1.5 rounded-lg border border-slate-800 bg-slate-900/60 text-slate-300 ${
              filters.page >= totalPages ? "opacity-40 pointer-events-none" : "hover:border-blue-500/50"
            }`}
          >
            下一页
          </Link>
        </div>
      )}
    </div>
  );
}
