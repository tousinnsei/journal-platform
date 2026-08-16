"use client";

import { useEffect, useState } from "react";
import {
  FileCheck,
  CheckCircle2,
  XCircle,
  ShieldAlert,
  Clock,
  Eye,
  X,
} from "lucide-react";

interface JournalItem {
  id: string;
  title: string;
  description?: string | null;
  status: "DRAFT" | "PENDING" | "PUBLISHED" | "REJECTED";
  level?: "ORDINARY" | "CORE";
  auditReason?: string | null;
  createdAt?: string;
  updatedAt?: string;
  publisher?: { name: string };
  categories?: { category: { name: string } }[];
  indexingDatabases?: { database: { id: string; name: string; slug: string } }[];
  formats?: { format: { id: string; name: string; slug: string } }[];
  indexes?: { index: { id: string; name: string; slug: string } }[];
  fields?: { field: { id: string; name: string; slug: string } }[];
  minSalePrice?: number | null;
  minCostPrice?: number | null;
  currency?: string;
  sources?: { id: string; sourceName: string; costPrice: number | null; salePrice: number; currency: string; status: string; contacts: string | null }[];
  createdBy?: { name: string; email: string } | null;
}

export default function AuditWorkflow() {
  const [journals, setJournals] = useState<JournalItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [detail, setDetail] = useState<JournalItem | null>(null);
  const [rejecting, setRejecting] = useState<JournalItem | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        const res = await fetch("/api/v1/admin/journals?status=PENDING");
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok) throw new Error(data.message || "获取待审核期刊失败");
        setJournals(data.data || []);
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
  }, [refreshKey]);

  const runAudit = async (journal: JournalItem, status: "PUBLISHED" | "REJECTED", reason?: string) => {
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch(`/api/v1/admin/journals/${journal.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(status === "REJECTED" ? { status, auditReason: reason || undefined } : { status }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "审核操作失败");

      setNotice(data.message || "审核完成");
      setRejecting(null);
      setDetail(null);
      setRejectReason("");
      setRefreshKey((k) => k + 1);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "审核操作失败");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <FileCheck className="w-6 h-6 text-emerald-400" />
            <span>期刊审核工作流</span>
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            仅超级管理员可执行审核操作，通过后期刊将立即发布。
          </p>
        </div>
        <button
          onClick={() => setRefreshKey((k) => k + 1)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-sm rounded-xl transition-all cursor-pointer"
        >
          <Clock className="w-4 h-4" />
          <span>刷新待审核列表</span>
        </button>
      </div>

      {notice && (
        <div className="p-4 rounded-xl bg-emerald-950/50 border border-emerald-800/60 text-emerald-300 text-sm flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span>{notice}</span>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-red-950/50 border border-red-800/60 text-red-300 text-sm flex items-center gap-3">
          <ShieldAlert className="w-5 h-5 text-red-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Pending List */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        {loading ? (
          <div className="p-12 text-center text-slate-500 text-sm space-y-3">
            <div className="w-6 h-6 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin mx-auto" />
            <p>加载待审核期刊中...</p>
          </div>
        ) : journals.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-sm">
            暂无待审核期刊，所有期刊均已处理完毕。
          </div>
        ) : (
          <div className="divide-y divide-slate-800/60">
            {journals.map((j) => (
              <div key={j.id} className="p-5 flex flex-col md:flex-row md:items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-white">{j.title}</h3>
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-semibold border ${
                        j.level === "CORE"
                          ? "bg-amber-950 text-amber-400 border-amber-800/60"
                          : "bg-slate-950 text-slate-400 border-slate-800"
                      }`}
                    >
                      {j.level === "CORE" ? "核心" : "普通"}
                    </span>
                    <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-amber-950 text-amber-400 border border-amber-800/60 font-medium">
                      <Clock className="w-3 h-3" /> 待审核
                    </span>
                  </div>
                  <div className="flex items-center gap-4 mt-1.5 text-xs text-slate-400 flex-wrap">
                    <span>{j.publisher?.name || "-"}</span>
                    <span className="text-emerald-400">
                      {j.minSalePrice != null ? `售价 ${j.minSalePrice} ${j.currency ?? ""}` : "暂无报价"}
                    </span>
                    {(j.indexingDatabases || []).slice(0, 2).map((r) => (
                      <span key={r.database.id} className="text-emerald-400">{r.database.name}</span>
                    ))}
                    {(j.indexes || []).slice(0, 2).map((r) => (
                      <span key={r.index.id} className="text-indigo-400">{r.index.name}</span>
                    ))}
                    {j.createdBy && (
                      <span className="text-slate-500">提交人: {j.createdBy.name || j.createdBy.email}</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => setDetail(j)}
                    className="inline-flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>查看详情</span>
                  </button>
                  <button
                    onClick={() => runAudit(j, "PUBLISHED")}
                    disabled={submitting}
                    className="inline-flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>审核通过</span>
                  </button>
                  <button
                    onClick={() => {
                      setRejectReason("");
                      setRejecting(j);
                    }}
                    disabled={submitting}
                    className="inline-flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg bg-red-950/60 hover:bg-red-900/60 text-red-400 border border-red-900/40 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    <span>驳回</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {detail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setDetail(null)} />
          <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-700 rounded-2xl p-6 shadow-2xl space-y-5 max-h-[85vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-white">{detail.title}</h2>
              </div>
              <button onClick={() => setDetail(null)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3 text-sm">
              <div>
                <span className="text-slate-500 text-xs">出版社</span>
                <p className="text-slate-200">{detail.publisher?.name || "-"}</p>
              </div>
              <div>
                <span className="text-slate-500 text-xs">期刊级别</span>
                <p className="text-slate-200">
                  {detail.level === "CORE" ? "核心 (CORE)" : detail.level === "ORDINARY" ? "普通 (ORDINARY)" : "-"}
                </p>
              </div>
              <div>
                <span className="text-slate-500 text-xs">最低售价</span>
                <p className="text-emerald-400">
                  {detail.minSalePrice != null ? `${detail.minSalePrice} ${detail.currency ?? ""}` : "-"}
                </p>
              </div>
              <div>
                <span className="text-slate-500 text-xs">最低成本</span>
                <p className="text-slate-200">{detail.minCostPrice != null ? `${detail.minCostPrice} ${detail.currency ?? ""}` : "-"}</p>
              </div>
              <div>
                <span className="text-slate-500 text-xs">提交时间</span>
                <p className="text-slate-200">
                  {detail.createdAt ? new Date(detail.createdAt).toLocaleString("zh-CN") : "-"}
                </p>
              </div>
            </div>

            {detail.description && (
              <div>
                <span className="text-slate-500 text-xs">期刊简介</span>
                <p className="text-slate-200 text-sm mt-1 leading-relaxed">{detail.description}</p>
              </div>
            )}

            <div>
              <span className="text-slate-500 text-xs">资源渠道（{detail.sources?.length ?? 0}）</span>
              <div className="flex flex-wrap gap-2 mt-1.5">
                {(detail.sources || []).map((s) => (
                  <span key={s.id} className="px-2.5 py-1 rounded-lg bg-emerald-950 text-emerald-400 border border-emerald-800/60 text-xs">
                    {s.sourceName} · 售价 {s.salePrice} {s.currency}
                    {s.costPrice != null ? ` · 成本 ${s.costPrice}` : ""}
                    {s.status === "DISABLED" ? " · 停用" : ""}
                  </span>
                ))}
                {(detail.sources || []).length === 0 && (
                  <span className="text-slate-500 text-xs">未设置</span>
                )}
              </div>
            </div>

            <div>
              <span className="text-slate-500 text-xs">学科分类</span>
              <div className="flex flex-wrap gap-2 mt-1.5">
                {(detail.categories || []).map((c, i) => (
                  <span key={i} className="px-2.5 py-1 rounded-lg bg-blue-950 text-blue-400 border border-blue-800/60 text-xs">
                    {c.category.name}
                  </span>
                ))}
                {(detail.categories || []).length === 0 && (
                  <span className="text-slate-500 text-xs">未分类</span>
                )}
              </div>
            </div>

            <div>
              <span className="text-slate-500 text-xs">收录网站</span>
              <div className="flex flex-wrap gap-2 mt-1.5">
                {(detail.indexingDatabases || []).map((r) => (
                  <span key={r.database.id} className="px-2.5 py-1 rounded-lg bg-emerald-950 text-emerald-400 border border-emerald-800/60 text-xs">
                    {r.database.name}
                  </span>
                ))}
                {(detail.indexingDatabases || []).length === 0 && (
                  <span className="text-slate-500 text-xs">未设置</span>
                )}
              </div>
            </div>

            <div>
              <span className="text-slate-500 text-xs">期刊形式</span>
              <div className="flex flex-wrap gap-2 mt-1.5">
                {(detail.formats || []).map((r) => (
                  <span key={r.format.id} className="px-2.5 py-1 rounded-lg bg-violet-950 text-violet-400 border border-violet-800/60 text-xs">
                    {r.format.name}
                  </span>
                ))}
                {(detail.formats || []).length === 0 && (
                  <span className="text-slate-500 text-xs">未设置</span>
                )}
              </div>
            </div>

            <div>
              <span className="text-slate-500 text-xs">核心/收录类型</span>
              <div className="flex flex-wrap gap-2 mt-1.5">
                {(detail.indexes || []).map((r) => (
                  <span key={r.index.id} className="px-2.5 py-1 rounded-lg bg-indigo-950 text-indigo-400 border border-indigo-800/60 text-xs">
                    {r.index.name}
                  </span>
                ))}
                {(detail.indexes || []).length === 0 && (
                  <span className="text-slate-500 text-xs">未设置</span>
                )}
              </div>
            </div>

            <div>
              <span className="text-slate-500 text-xs">所属领域</span>
              <div className="flex flex-wrap gap-2 mt-1.5">
                {(detail.fields || []).map((r) => (
                  <span key={r.field.id} className="px-2.5 py-1 rounded-lg bg-cyan-950 text-cyan-400 border border-cyan-800/60 text-xs">
                    {r.field.name}
                  </span>
                ))}
                {(detail.fields || []).length === 0 && (
                  <span className="text-slate-500 text-xs">未设置</span>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => {
                  setRejectReason("");
                  setRejecting(detail);
                  setDetail(null);
                }}
                className="px-4 py-2 rounded-xl bg-red-950/60 hover:bg-red-900/60 text-red-400 border border-red-900/40 text-sm cursor-pointer"
              >
                驳回
              </button>
              <button
                onClick={() => {
                  setDetail(null);
                  runAudit(detail, "PUBLISHED");
                }}
                disabled={submitting}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-sm rounded-xl cursor-pointer disabled:opacity-50"
              >
                审核通过
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {rejecting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setRejecting(null)} />
          <div className="relative w-full max-w-lg bg-slate-900 border border-slate-700 rounded-2xl p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-white">驳回期刊</h2>
              <button onClick={() => setRejecting(null)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 text-sm text-slate-300">
              <span className="font-semibold text-white">{rejecting.title}</span>
              <span className="ml-2 text-xs text-slate-500">{rejecting.publisher?.name}</span>
            </div>

            <div>
              <label className="block text-xs text-slate-300 mb-1.5">驳回理由 *</label>
              <textarea
                required
                rows={4}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="请填写驳回原因，例如：期刊信息不完整、ISSN 无法核实、分区数据缺失..."
                className="w-full px-3.5 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-red-500 resize-none"
              />
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setRejecting(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm cursor-pointer"
              >
                取消
              </button>
              <button
                onClick={() => runAudit(rejecting, "REJECTED", rejectReason.trim())}
                disabled={submitting || !rejectReason.trim()}
                className="px-5 py-2 bg-red-600 hover:bg-red-500 text-white font-medium text-sm rounded-xl flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <XCircle className="w-4 h-4" />
                <span>{submitting ? "正在提交..." : "确认驳回"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
