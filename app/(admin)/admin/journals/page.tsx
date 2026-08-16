"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  BookOpen,
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

interface DictOption {
  id: string;
  name: string;
  slug: string;
}

interface AdminJournalItem {
  id: string;
  title: string;
  description?: string | null;
  level: "ORDINARY" | "CORE";
  status: "DRAFT" | "PENDING" | "PUBLISHED" | "REJECTED";
  createdById?: string | null;
  publisher: { name: string };
  indexingDatabases: { database: DictOption }[];
  formats: { format: DictOption }[];
  indexes: { index: DictOption }[];
  fields: { field: DictOption }[];
  minSalePrice: number | null;
  minCostPrice: number | null;
  currency: string;
  sources: { id: string; sourceName: string }[];
  updatedAt: string;
}

interface Filters {
  keyword: string;
  publisher: string;
  indexing: string[];
  format: string[];
  level: string;
  index: string[];
  field: string[];
  priceMin: string;
  priceMax: string;
  sort: string;
  page: number;
}

const initialFilters: Filters = {
  keyword: "",
  publisher: "",
  indexing: [],
  format: [],
  level: "",
  index: [],
  field: [],
  priceMin: "",
  priceMax: "",
  sort: "latest",
  page: 1,
};

function toQuery(f: Filters, status: string): string {
  const p = new URLSearchParams();
  if (status !== "ALL") p.set("status", status);
  if (f.keyword.trim()) p.set("keyword", f.keyword.trim());
  if (f.publisher) p.set("publisher", f.publisher);
  if (f.indexing.length) p.set("indexing", f.indexing.join(","));
  if (f.format.length) p.set("format", f.format.join(","));
  if (f.level) p.set("level", f.level);
  if (f.index.length) p.set("index", f.index.join(","));
  if (f.field.length) p.set("field", f.field.join(","));
  if (f.priceMin) p.set("priceMin", f.priceMin);
  if (f.priceMax) p.set("priceMax", f.priceMax);
  if (f.sort && f.sort !== "latest") p.set("sort", f.sort);
  p.set("page", String(f.page));
  p.set("limit", "50");
  return p.toString();
}

export default function AdminJournalsListPage() {
  const { user } = useAuth();
  const [journals, setJournals] = useState<AdminJournalItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [filters, setFilters] = useState<Filters>(initialFilters);
  const [error, setError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [dicts, setDicts] = useState<{
    publishers: DictOption[];
    indexing: DictOption[];
    formats: DictOption[];
    indexes: DictOption[];
    fields: DictOption[];
  }>({ publishers: [], indexing: [], formats: [], indexes: [], fields: [] });

  useEffect(() => {
    let cancelled = false;
    const loadDicts = async () => {
      try {
        const [pubRes, idxRes, fmtRes, ixRes, fldRes] = await Promise.all([
          fetch("/api/v1/admin/publishers"),
          fetch("/api/v1/admin/indexing-databases"),
          fetch("/api/v1/admin/journal-formats"),
          fetch("/api/v1/admin/journal-indexes"),
          fetch("/api/v1/admin/fields"),
        ]);
        const toData = async (res: Response) => (await res.json()).data ?? [];
        if (cancelled) return;
        setDicts({
          publishers: await toData(pubRes),
          indexing: await toData(idxRes),
          formats: await toData(fmtRes),
          indexes: await toData(ixRes),
          fields: await toData(fldRes),
        });
      } catch {
        /* dictionaries are optional for the list view */
      }
    };
    loadDicts();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setLoading(true);
      try {
        const url = `/api/v1/admin/journals?${toQuery(filters, statusFilter)}`;
        const res = await fetch(url);
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok) throw new Error(data.message || "获取期刊列表失败");
        setJournals(data.data || []);
        setTotal(data.meta?.total ?? 0);
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
  }, [statusFilter, filters, refreshKey]);

  const setFilter = useCallback((patch: Partial<Filters>) => {
    setFilters((prev) => ({ ...prev, ...patch, page: 1 }));
  }, []);

  const toggle = (key: "indexing" | "format" | "index" | "field", slug: string) => {
    setFilters((prev) => ({
      ...prev,
      [key]: prev[key].includes(slug) ? prev[key].filter((s) => s !== slug) : [...prev[key], slug],
      page: 1,
    }));
  };

  const resetFilters = () => setFilters({ ...initialFilters });

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`确定要物理删除期刊《${title}》吗？此操作不可撤销！`)) return;
    try {
      const res = await fetch(`/api/v1/admin/journals/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "删除失败");
      alert("期刊物理删除成功！");
      setRefreshKey((k) => k + 1);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "删除操作被拒绝");
    }
  };

  const statusTabs = [
    { label: "全部期刊", value: "ALL" },
    { label: "已发布", value: "PUBLISHED" },
    { label: "待审核", value: "PENDING" },
    { label: "草稿", value: "DRAFT" },
    { label: "已驳回", value: "REJECTED" },
  ];

  const inputCls =
    "w-full px-3 py-2 rounded-lg bg-slate-950/70 border border-slate-800 text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-blue-500/60";

  const chip = (label: string, active: boolean, onClick: () => void) => (
    <button
      key={label}
      type="button"
      onClick={onClick}
      className={`px-2 py-1 rounded-full text-[11px] border transition-colors cursor-pointer ${
        active
          ? "bg-blue-600 border-blue-500 text-white"
          : "bg-slate-950/60 border-slate-800 text-slate-400 hover:border-blue-500/50"
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <BookOpen className="w-6 h-6 text-blue-400" />
            <span>期刊管理列表</span>
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            支持状态、级别、收录网站、期刊形式、核心/收录类型、所属领域、价格区间等组合筛选。
          </p>
        </div>
        <Link
          href="/admin/journals/create"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-xl shadow-lg shadow-blue-600/30 text-sm transition-all shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>录入新期刊</span>
        </Link>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-950/50 border border-red-800/60 text-red-300 text-sm flex items-center gap-3">
          <ShieldAlert className="w-5 h-5 text-red-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Status Tabs */}
      <div className="flex flex-wrap gap-1 bg-slate-900/60 border border-slate-800 p-1 rounded-xl w-fit">
        {statusTabs.map((tab) => (
          <button
            key={tab.value}
            onClick={() => {
              setLoading(true);
              setStatusFilter(tab.value);
            }}
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

      {/* Filters */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 space-y-3">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          <div className="col-span-2 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              className={`${inputCls} pl-9`}
              placeholder="搜期刊名称 / 出版社..."
              value={filters.keyword}
              onChange={(e) => setFilter({ keyword: e.target.value })}
            />
          </div>
          <select
            className={inputCls}
            value={filters.publisher}
            onChange={(e) => setFilter({ publisher: e.target.value })}
          >
            <option value="">全部出版社</option>
            {dicts.publishers.map((p) => (
              <option key={p.id} value={p.slug}>
                {p.name}
              </option>
            ))}
          </select>
          <select
            className={inputCls}
            value={filters.level}
            onChange={(e) => setFilter({ level: e.target.value })}
          >
            <option value="">全部级别</option>
            <option value="CORE">核心</option>
            <option value="ORDINARY">普通</option>
          </select>
          <select
            className={inputCls}
            value={filters.sort}
            onChange={(e) => setFilter({ sort: e.target.value })}
          >
            <option value="latest">最新更新</option>
            <option value="price-asc">价格从低到高</option>
            <option value="price-desc">价格从高到低</option>
          </select>
          <div className="flex items-center gap-1.5">
            <input
              className={inputCls}
              type="number"
              min="0"
              placeholder="最低价"
              value={filters.priceMin}
              onChange={(e) => setFilter({ priceMin: e.target.value })}
            />
            <input
              className={inputCls}
              type="number"
              min="0"
              placeholder="最高价"
              value={filters.priceMax}
              onChange={(e) => setFilter({ priceMax: e.target.value })}
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] text-slate-500 w-14 shrink-0">收录网站</span>
          {dicts.indexing.map((d) => chip(d.name, filters.indexing.includes(d.slug), () => toggle("indexing", d.slug)))}
          <span className="text-[11px] text-slate-500 w-14 shrink-0 ml-3">期刊形式</span>
          {dicts.formats.map((d) => chip(d.name, filters.format.includes(d.slug), () => toggle("format", d.slug)))}
          <span className="text-[11px] text-slate-500 w-14 shrink-0 ml-3">核心/类型</span>
          {dicts.indexes.map((d) => chip(d.name, filters.index.includes(d.slug), () => toggle("index", d.slug)))}
          <span className="text-[11px] text-slate-500 w-14 shrink-0 ml-3">所属领域</span>
          {dicts.fields.map((d) => chip(d.name, filters.field.includes(d.slug), () => toggle("field", d.slug)))}
        </div>

        <div className="flex items-center justify-between">
          <span className="text-[11px] text-slate-500">
            共 {total} 条期刊记录
          </span>
          <button
            type="button"
            onClick={resetFilters}
            className="text-[11px] text-slate-500 hover:text-white transition-colors cursor-pointer"
          >
            重置全部筛选
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        {loading ? (
          <div className="p-12 text-center text-slate-500 text-sm space-y-3">
            <div className="w-6 h-6 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mx-auto" />
            <p>加载期刊数据中...</p>
          </div>
        ) : journals.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-sm">暂无匹配的期刊记录</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-950/80 text-slate-400 uppercase text-[11px] font-semibold border-b border-slate-800">
                <tr>
                  <th className="px-4 py-4">期刊</th>
                  <th className="px-4 py-4">出版社</th>
                  <th className="px-4 py-4">收录网站</th>
                  <th className="px-4 py-4">期刊形式</th>
                  <th className="px-4 py-4">核心/类型</th>
                  <th className="px-4 py-4">所属领域</th>
                  <th className="px-4 py-4">代理价格 / 渠道</th>
                  <th className="px-4 py-4">状态</th>
                  <th className="px-4 py-4 text-right">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {journals.map((j) => (
                  <tr key={j.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-white max-w-[180px] truncate">{j.title}</span>
                        <span
                          className={`shrink-0 px-1.5 py-0.5 rounded text-[10px] font-semibold border ${
                            j.level === "CORE"
                              ? "bg-amber-950 text-amber-400 border-amber-800/60"
                              : "bg-slate-950 text-slate-400 border-slate-800"
                          }`}
                        >
                          {j.level === "CORE" ? "核心" : "普通"}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5">
                        {j.sources.length > 0 ? `${j.sources.length} 个资源渠道` : "暂无资源渠道"}
                      </div>
                    </td>
                    <td className="px-4 py-4 text-xs text-slate-300">{j.publisher?.name ?? "—"}</td>
                    <td className="px-4 py-4">
                      <div className="flex flex-wrap gap-1 max-w-[180px]">
                        {j.indexingDatabases.length > 0 ? (
                          j.indexingDatabases.map((r) => (
                            <span key={r.database.id} className="px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800/60 text-[10px]">
                              {r.database.name}
                            </span>
                          ))
                        ) : (
                          <span className="text-slate-600 text-xs">—</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex flex-wrap gap-1 max-w-[160px]">
                        {j.formats.length > 0 ? (
                          j.formats.map((r) => (
                            <span key={r.format.id} className="px-1.5 py-0.5 rounded bg-violet-950 text-violet-400 border border-violet-800/60 text-[10px]">
                              {r.format.name}
                            </span>
                          ))
                        ) : (
                          <span className="text-slate-600 text-xs">—</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex flex-wrap gap-1 max-w-[160px]">
                        {j.indexes.length > 0 ? (
                          j.indexes.map((r) => (
                            <span key={r.index.id} className="px-1.5 py-0.5 rounded bg-indigo-950 text-indigo-400 border border-indigo-800/60 text-[10px]">
                              {r.index.name}
                            </span>
                          ))
                        ) : (
                          <span className="text-slate-600 text-xs">—</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex flex-wrap gap-1 max-w-[160px]">
                        {j.fields.length > 0 ? (
                          j.fields.map((r) => (
                            <span key={r.field.id} className="px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800/60 text-[10px]">
                              {r.field.name}
                            </span>
                          ))
                        ) : (
                          <span className="text-slate-600 text-xs">—</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4 text-xs">
                      {j.minSalePrice != null ? (
                        <div className="space-y-0.5">
                          <div className="text-emerald-400">
                            售价 <span className="text-emerald-300 font-medium">{formatPrice(j.minSalePrice, j.currency)}</span>
                          </div>
                          <div className="text-slate-400">
                            成本{" "}
                            {j.minCostPrice != null ? (
                              <span className="text-slate-200 font-medium">{formatPrice(j.minCostPrice, j.currency)}</span>
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
                      {j.status === "PUBLISHED" && (
                        <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800/60 font-medium">
                          <CheckCircle2 className="w-3 h-3" /> 已发布
                        </span>
                      )}
                      {j.status === "PENDING" && (
                        <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-amber-950 text-amber-400 border border-amber-800/60 font-medium">
                          <Clock className="w-3 h-3" /> 待审核
                        </span>
                      )}
                      {j.status === "DRAFT" && (
                        <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700 font-medium">
                          <AlertCircle className="w-3 h-3" /> 草稿
                        </span>
                      )}
                      {j.status === "REJECTED" && (
                        <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-red-950 text-red-400 border border-red-800/60 font-medium">
                          <XCircle className="w-3 h-3" /> 已驳回
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-4 text-right space-x-2 whitespace-nowrap">
                      {(user?.role === "SUPER_ADMIN" || j.createdById === user?.id) && (
                        <Link
                          href={`/admin/journals/${j.id}/edit`}
                          className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
                        >
                          <Edit className="w-3.5 h-3.5" />
                          <span>编辑</span>
                        </Link>
                      )}
                      {user?.role === "SUPER_ADMIN" && (
                        <button
                          onClick={() => handleDelete(j.id, j.title)}
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
