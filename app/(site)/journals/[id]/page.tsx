import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { publicJournalInclude, toPublicJournal } from "@/lib/public-journal";
import { formatPriceWithCurrency } from "@/lib/price";
import { JournalStatus } from "@prisma/client";
import {
  ArrowLeft,
  BadgeDollarSign,
  Database,
  Layers,
  Award,
  Tags,
  Building2,
  FileText,
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function PublicJournalDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const journal = await db.journal.findFirst({
    where: { id, status: JournalStatus.PUBLISHED },
    include: publicJournalInclude,
  });

  if (!journal) {
    notFound();
  }

  const j = toPublicJournal(journal);

  const attributeGroup = (icon: React.ReactNode, title: string, items: { id: string; name: string }[]) =>
    items.length > 0 ? (
      <div>
        <dt className="text-slate-500 text-xs flex items-center gap-1">
          {icon}
          {title}
        </dt>
        <dd className="flex flex-wrap gap-1.5 mt-1">
          {items.map((item) => (
            <span
              key={item.id}
              className="text-xs px-2 py-0.5 rounded bg-slate-950 text-slate-300 border border-slate-800"
            >
              {item.name}
            </span>
          ))}
        </dd>
      </div>
    ) : null;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Link
        href="/journals"
        className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        返回期刊目录
      </Link>

      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <h1 className="text-2xl font-bold text-white tracking-tight">{j.title}</h1>
          <span
            className={`shrink-0 px-3 py-1 rounded-lg text-xs font-bold border ${
              j.level === "CORE"
                ? "bg-amber-950 text-amber-400 border-amber-800/60"
                : "bg-slate-950 text-slate-400 border-slate-800"
            }`}
          >
            {j.level === "CORE" ? "核心期刊" : "普通期刊"}
          </span>
        </div>

        {j.description && (
          <p className="text-sm text-slate-400 leading-relaxed">{j.description}</p>
        )}

        <div className="flex flex-wrap gap-2 text-xs">
          {j.publisher && (
            <span className="px-2 py-1 rounded bg-blue-950 text-blue-400 border border-blue-800/60">
              {j.publisher.name}
            </span>
          )}
          {j.formats.map((f) => (
            <span
              key={f.id}
              className="px-2 py-1 rounded bg-violet-950 text-violet-400 border border-violet-800/60"
            >
              {f.name}
            </span>
          ))}
          {j.indexes.map((i) => (
            <span
              key={i.id}
              className="px-2 py-1 rounded bg-indigo-950 text-indigo-400 border border-indigo-800/60"
            >
              {i.name}
            </span>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-4">
            <h2 className="text-sm font-bold text-blue-400 uppercase tracking-wider flex items-center gap-2">
              <FileText className="w-4 h-4" />
              期刊信息
            </h2>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
              <div>
                <dt className="text-slate-500 text-xs flex items-center gap-1">
                  <Building2 className="w-3.5 h-3.5" />
                  出版社
                </dt>
                <dd className="text-slate-200">{j.publisher?.name ?? "—"}</dd>
              </div>
              {attributeGroup(
                <Database className="w-3.5 h-3.5" />,
                "收录网站",
                j.indexingDatabases
              )}
              {attributeGroup(<Layers className="w-3.5 h-3.5" />, "期刊形式", j.formats)}
              {attributeGroup(<Award className="w-3.5 h-3.5" />, "核心/收录类型", j.indexes)}
              {attributeGroup(<Tags className="w-3.5 h-3.5" />, "所属领域", j.fields)}
            </dl>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6">
            <h2 className="text-sm font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-2">
              <BadgeDollarSign className="w-4 h-4" />
              代理价格
            </h2>
            {j.minSalePrice != null ? (
              <div className="mt-4 space-y-1">
                <div className="text-3xl font-extrabold text-emerald-400 tracking-tight">
                  {formatPriceWithCurrency(j.minSalePrice, j.currency)}
                </div>
                <p className="text-xs text-slate-500 mt-2">
                  价格为平台实时数据库数据，如需咨询订阅或订购请联系我们。
                </p>
              </div>
            ) : (
              <p className="mt-4 text-sm text-slate-500">暂无报价</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
