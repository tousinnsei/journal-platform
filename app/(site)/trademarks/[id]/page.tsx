import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { publicTrademarkInclude, toPublicTrademark } from "@/lib/public-resource";
import { formatPriceWithCurrency } from "@/lib/price";
import { ResourceStatus } from "@prisma/client";
import { ArrowLeft, BadgeDollarSign, Tags, User, StickyNote } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function PublicTrademarkDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const trademark = await db.trademarkService.findFirst({
    where: { id, status: ResourceStatus.PUBLISHED },
    include: publicTrademarkInclude,
  });

  if (!trademark) {
    notFound();
  }

  const t = toPublicTrademark(trademark);

  const row = (icon: React.ReactNode, label: string, value: string | null) => (
    <div>
      <dt className="text-slate-500 text-xs flex items-center gap-1">
        {icon}
        {label}
      </dt>
      <dd className="text-slate-200 mt-0.5">{value || "—"}</dd>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Link
        href="/trademarks"
        className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        返回商标服务
      </Link>

      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <h1 className="text-2xl font-bold text-white tracking-tight">{t.name}</h1>
          <span className="shrink-0 px-3 py-1 rounded-lg text-xs font-bold border bg-slate-950 text-slate-300 border-slate-800">
            商标服务
          </span>
        </div>

        {t.description && (
          <p className="text-sm text-slate-400 leading-relaxed">{t.description}</p>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-4">
            <h2 className="text-sm font-bold text-blue-400 uppercase tracking-wider flex items-center gap-2">
              <Tags className="w-4 h-4" />
              服务信息
            </h2>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
              {row(<Tags className="w-3.5 h-3.5" />, "服务名称", t.name)}
              {row(<User className="w-3.5 h-3.5" />, "录入人", t.createdByName)}
              {t.note ? (
                <div className="sm:col-span-2">
                  <dt className="text-slate-500 text-xs flex items-center gap-1">
                    <StickyNote className="w-3.5 h-3.5" />
                    备注
                  </dt>
                  <dd className="text-slate-200 mt-0.5">{t.note}</dd>
                </div>
              ) : null}
            </dl>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6">
            <h2 className="text-sm font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-2">
              <BadgeDollarSign className="w-4 h-4" />
              代理价格
            </h2>
            {t.minSalePrice != null ? (
              <div className="mt-4 space-y-1">
                <div className="text-3xl font-extrabold text-emerald-400 tracking-tight">
                  {formatPriceWithCurrency(t.minSalePrice, t.currency)}
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
