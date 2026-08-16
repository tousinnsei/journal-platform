"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Tags,
  Search,
  Plus,
  Edit,
  Trash2,
  CheckCircle2,
  Clock,
  AlertCircle,
  XCircle,
  ShieldAlert,
} from "lucide-react";
import { useAuth } from "@/lib/use-auth";
import { formatPrice } from "@/lib/price";

interface AdminTrademarkItem {
  id: string;
  name: string;
  status: "DRAFT" | "PENDING" | "PUBLISHED" | "REJECTED";
  createdById?: string | null;
  minSalePrice: number | null;
  minCostPrice: number | null;
  currency: string;
  sources: { id: string; sourceName: string }[];
}

export default function AdminTrademarksListPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<AdminTrademarkItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [error, setError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setLoading(true);
      try {
        const p = new URLSearchParams();
        if (statusFilter !== "ALL") p.set("status", statusFilter);
        if (keyword.trim()) p.set("keyword", keyword.trim());
        p.set("limit", "100");
        const res = await fetch(`/api/v1/admin/trademarks?${p.toString()}`);
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok) throw new Error(data.message || "获取商标服务列表失败");
        setItems(data.data || []);
        setTotal(data.meta?.total ?? (data.data || []).length);
        setError("");
      } catch (err: unknown) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "网络异常");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [statusFilter, keyword, refreshKey]);

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`确定要物理删除商标服务《${name}》吗？此操作不可撤销！`)) return;
    try {
      const res = await fetch(`/api/v1/admin/trademarks/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "删除失败");
      alert("商标服务物理删除成功！");
      setRefreshKey((k) => k + 1);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "删除操作被拒绝");
    }
  };

  const handleAudit = async (id: string, name: string, approve: boolean) => {
    if (!confirm(`确定要${approve ? "审核通过并发布" : "驳回"}商标服务《${name}》吗？`)) return;
    try {
      const res = await fetch(`/api/v1/admin/trademarks/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: approve ? "PUBLISHED" : "REJECTED" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "审核失败");
      alert(data.message || "操作成功");
      setRefreshKey((k) => k + 1);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "审核操作失败");
    }
  };

  const statusTabs = [
    { label: "全部", value: "ALL" },
    { label: "已发布", value: "PUBLISHED" },
    { label: "待审核", value: "PENDING" },
    { label: "草稿", value: "DRAFT" },
    { label: "已驳回", value: "REJECTED" },
  ];

  const inputCls =
    "w-full px-3 py-2 rounded-lg bg-slate-950/70 border border-slate-800 text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-blue-500/60";

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <Tags className="w-6 h-6 text-blue-400" />
            <span>商标服务管理列表</span>
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            管理商标服务资源及其内部渠道价格。渠道成本价格永不对外展示。
          </p>
        </div>
        <Link
          href="/admin/trademarks/create"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-xl shadow-lg shadow-blue-600/30 text-sm transition-all shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>录入新商标服务</span>
        </Link>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-950/50 border border-red-800/60 text-red-300 text-sm flex items-center gap-3">
          <ShieldAlert className="w-5 h-5 text-red-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="flex flex-wrap gap-1 bg-slate-900/60 border border-slate-800 p-1 rounded-xl w-fit">
        {statusTabs.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setStatusFilter(tab.value)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
              statusFilter === tab.value
                ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            className={`${inputCls} pl-9`}
            placeholder="搜服务名称 / 简介..."
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
          />
        </div>
        <div className="mt-2 text-[11px] text-slate-500">共 {total} 条商标服务记录</div>
      </div>

      <div className="bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        {loading ? (
          <div className="p-12 text-center text-slate-500 text-sm space-y-3">
            <div className="w-6 h-6 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mx-auto" />
            <p>加载商标服务数据中...</p>
          </div>
        ) : items.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-sm">暂无匹配的商标服务记录</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-950/80 text-slate-400 uppercase text-[11px] font-semibold border-b border-slate-800">
                <tr>
                  <th className="px-4 py-4">服务</th>
                  <th className="px-4 py-4">代理价格 / 渠道</th>
                  <th className="px-4 py-4">状态</th>
                  <th className="px-4 py-4 text-right">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {items.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="px-4 py-4">
                      <div className="font-semibold text-white max-w-[280px] truncate">{t.name}</div>
                      <div className="text-[10px] text-slate-500 mt-0.5">
                        {t.sources.length > 0 ? `${t.sources.length} 个资源渠道` : "暂无资源渠道"}
                      </div>
                    </td>
                    <td className="px-4 py-4 text-xs">
                      {t.minSalePrice != null ? (
                        <div className="space-y-0.5">
                          <div className="text-emerald-400">
                            售价 <span className="text-emerald-300 font-medium">{formatPrice(t.minSalePrice, t.currency)}</span>
                          </div>
                          <div className="text-slate-400">
                            成本{" "}
                            {t.minCostPrice != null ? (
                              <span className="text-slate-200 font-medium">{formatPrice(t.minCostPrice, t.currency)}</span>
                            ) : (
                              <span className="text-slate-500">未设置</span>
                            )}
                          </div>
                        </div>
                      ) : (
                        <span className="text-slate-500">未设置</span>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      {t.status === "PUBLISHED" && (
                        <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800/60 font-medium">
                          <CheckCircle2 className="w-3 h-3" /> 已发布
                        </span>
                      )}
                      {t.status === "PENDING" && (
                        <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-amber-950 text-amber-400 border border-amber-800/60 font-medium">
                          <Clock className="w-3 h-3" /> 待审核
                        </span>
                      )}
                      {t.status === "DRAFT" && (
                        <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700 font-medium">
                          <AlertCircle className="w-3 h-3" /> 草稿
                        </span>
                      )}
                      {t.status === "REJECTED" && (
                        <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-red-950 text-red-400 border border-red-800/60 font-medium">
                          <XCircle className="w-3 h-3" /> 已驳回
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-4 text-right space-x-2 whitespace-nowrap">
                      {user?.role === "SUPER_ADMIN" && t.status === "PENDING" && (
                        <>
                          <button
                            onClick={() => handleAudit(t.id, t.name, true)}
                            className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg bg-emerald-950/60 hover:bg-emerald-900/60 text-emerald-400 border border-emerald-900/40 transition-colors cursor-pointer"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>通过</span>
                          </button>
                          <button
                            onClick={() => handleAudit(t.id, t.name, false)}
                            className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg bg-red-950/60 hover:bg-red-900/60 text-red-400 border border-red-900/40 transition-colors cursor-pointer"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            <span>驳回</span>
                          </button>
                        </>
                      )}
                      {(user?.role === "SUPER_ADMIN" || t.createdById === user?.id) && (
                        <Link
                          href={`/admin/trademarks/${t.id}/edit`}
                          className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
                        >
                          <Edit className="w-3.5 h-3.5" />
                          <span>编辑</span>
                        </Link>
                      )}
                      {user?.role === "SUPER_ADMIN" && (
                        <button
                          onClick={() => handleDelete(t.id, t.name)}
                          className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg bg-red-950/60 hover:bg-red-900/60 text-red-400 border border-red-900/40 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>删除</span>
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
