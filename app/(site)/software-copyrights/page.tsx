import Link from "next/link";
import { db } from "@/lib/db";
import { publicCopyrightInclude } from "@/lib/public-resource";
import { formatPrice } from "@/lib/price";
import { ResourceStatus } from "@prisma/client";
import { FileText, Search } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function PublicCopyrightsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const keyword = typeof sp.keyword === "string" ? sp.keyword.trim() : "";
  const page = Math.max(1, parseInt(typeof sp.page === "string" ? sp.page : "1", 10) || 1);
  const limit = 12;

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

  const [list, total] = await Promise.all([
    db.softwareCopyright.findMany({
      where,
      include: publicCopyrightInclude,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    db.softwareCopyright.count({ where }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / limit));
  const pageHref = (p: number) => {
    const params = new URLSearchParams();
    if (keyword) params.set("keyword", keyword);
    params.set("page", String(p));
    return `/software-copyrights?${params.toString()}`;
  };

  return (
    <div className="space-y-8">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-white tracking-tight">软著服务</h1>
        <p className="text-slate-400 text-sm">已发布的软件著作权代办服务，支持普通与加急办理。</p>
      </div>

      <form method="get" action="/software-copyrights" className="flex items-center gap-2 max-w-md mx-auto">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            name="keyword"
            defaultValue={keyword}
            placeholder="搜软著名称 / 登记号 / 著作权人..."
            className="w-full pl-9 px-3 py-2 rounded-xl bg-slate-900/60 border border-slate-800 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-blue-500/60"
          />
        </div>
        <button
          type="submit"
          className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-colors cursor-pointer"
        >
          搜索
        </button>
      </form>

      {list.length === 0 ? (
        <div className="p-12 text-center text-slate-500 text-sm bg-slate-900/50 border border-slate-800 rounded-2xl">
          没有符合条件的软著，请调整搜索条件。
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {list.map((c) => (
            <Link
              key={c.id}
              href={`/software-copyrights/${c.id}`}
              className="group bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-3 hover:border-blue-500/50 transition-all"
            >
              <div className="flex items-start justify-between gap-2">
                <h2 className="font-semibold text-white group-hover:text-blue-400 transition-colors leading-snug">
                  {c.name}
                </h2>
                <span
                  className={`shrink-0 px-2 py-0.5 rounded text-[10px] font-semibold border ${
                    c.type === "URGENT"
                      ? "bg-amber-950 text-amber-400 border-amber-800/60"
                      : "bg-slate-950 text-slate-400 border-slate-800"
                  }`}
                >
                  {c.type === "URGENT" ? "加急" : "普通"}
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <FileText className="w-3.5 h-3.5 text-slate-500" />
                <span className="text-slate-400">{c.registrationNo || "暂无登记号"}</span>
              </div>
              <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
                <span className="text-xs text-slate-500">{c.copyrightOwner || "著作权人未公开"}</span>
                {c.minSalePrice != null ? (
                  <span className="text-sm font-bold text-emerald-400">
                    {formatPrice(c.minSalePrice, c.currency)}{" "}
                    <span className="text-xs font-normal text-slate-400">{c.currency}</span>
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
            href={pageHref(Math.max(1, page - 1))}
            className={`px-3 py-1.5 rounded-lg border border-slate-800 bg-slate-900/60 text-slate-300 ${
              page <= 1 ? "opacity-40 pointer-events-none" : "hover:border-blue-500/50"
            }`}
          >
            上一页
          </Link>
          <span className="px-3 py-1.5 text-slate-400">
            第 {page} / {totalPages} 页 · 共 {total} 条
          </span>
          <Link
            href={pageHref(Math.min(totalPages, page + 1))}
            className={`px-3 py-1.5 rounded-lg border border-slate-800 bg-slate-900/60 text-slate-300 ${
              page >= totalPages ? "opacity-40 pointer-events-none" : "hover:border-blue-500/50"
            }`}
          >
            下一页
          </Link>
        </div>
      )}
    </div>
  );
}
