"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search, X } from "lucide-react";

interface Option {
  id: string;
  name: string;
  slug: string;
}

interface CurrentFilters {
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
}

interface PublicJournalFiltersProps {
  current: CurrentFilters;
  publishers: Option[];
  indexingDatabases: Option[];
  formats: Option[];
  indexes: Option[];
  fields: Option[];
  count: number;
  total: number;
}

function Chip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-2.5 py-1 rounded-full text-xs border transition-colors ${
        active
          ? "bg-blue-600 border-blue-500 text-white"
          : "bg-slate-900/60 border-slate-800 text-slate-400 hover:border-blue-500/50"
      }`}
    >
      {label}
    </button>
  );
}

export function PublicJournalFilters(props: PublicJournalFiltersProps) {
  const { current, publishers, indexingDatabases, formats, indexes, fields } = props;
  const router = useRouter();
  const [f, setF] = useState<CurrentFilters>(current);

  const toggle = (key: "indexing" | "format" | "index" | "field", slug: string) => {
    setF((prev) => ({
      ...prev,
      [key]: prev[key].includes(slug)
        ? prev[key].filter((s) => s !== slug)
        : [...prev[key], slug],
    }));
  };

  const buildQuery = () => {
    const p = new URLSearchParams();
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
    p.set("page", "1");
    return p.toString();
  };

  const apply = () => router.push(`/journals?${buildQuery()}`);
  const reset = () => {
    setF({
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
    });
    router.push("/journals");
  };

  const inputCls =
    "w-full px-3 py-2 rounded-lg bg-slate-900/70 border border-slate-800 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-blue-500/60";

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
          <Search className="w-4 h-4 text-blue-400" />
          筛选期刊
          <span className="text-xs font-normal text-slate-500">
            找到 {props.total} 条，当前显示 {props.count} 条
          </span>
        </h2>
        <button
          type="button"
          onClick={reset}
          className="text-xs text-slate-500 hover:text-white inline-flex items-center gap-1"
        >
          <X className="w-3.5 h-3.5" />
          重置
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="space-y-1.5">
          <label className="text-xs text-slate-500">关键词</label>
          <input
            className={inputCls}
            placeholder="期刊名称 / 出版社"
            value={f.keyword}
            onChange={(e) => setF({ ...f, keyword: e.target.value })}
            onKeyDown={(e) => e.key === "Enter" && apply()}
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs text-slate-500">出版社</label>
          <select
            className={inputCls}
            value={f.publisher}
            onChange={(e) => setF({ ...f, publisher: e.target.value })}
          >
            <option value="">全部出版社</option>
            {publishers.map((p) => (
              <option key={p.id} value={p.slug}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs text-slate-500">期刊级别</label>
          <select
            className={inputCls}
            value={f.level}
            onChange={(e) => setF({ ...f, level: e.target.value })}
          >
            <option value="">全部级别</option>
            <option value="CORE">核心</option>
            <option value="ORDINARY">普通</option>
          </select>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs text-slate-500">排序</label>
          <select
            className={inputCls}
            value={f.sort}
            onChange={(e) => setF({ ...f, sort: e.target.value })}
          >
            <option value="latest">最新发布</option>
            <option value="price-asc">价格从低到高</option>
            <option value="price-desc">价格从高到低</option>
          </select>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs text-slate-500">代理价格区间</label>
          <div className="flex items-center gap-2">
            <input
              className={inputCls}
              type="number"
              min="0"
              placeholder="最低"
              value={f.priceMin}
              onChange={(e) => setF({ ...f, priceMin: e.target.value })}
            />
            <span className="text-slate-600">-</span>
            <input
              className={inputCls}
              type="number"
              min="0"
              placeholder="最高"
              value={f.priceMax}
              onChange={(e) => setF({ ...f, priceMax: e.target.value })}
            />
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-slate-500 w-16 shrink-0">收录网站</span>
          {indexingDatabases.map((d) => (
            <Chip
              key={d.id}
              label={d.name}
              active={f.indexing.includes(d.slug)}
              onClick={() => toggle("indexing", d.slug)}
            />
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-slate-500 w-16 shrink-0">期刊形式</span>
          {formats.map((d) => (
            <Chip
              key={d.id}
              label={d.name}
              active={f.format.includes(d.slug)}
              onClick={() => toggle("format", d.slug)}
            />
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-slate-500 w-16 shrink-0">核心/收录</span>
          {indexes.map((d) => (
            <Chip
              key={d.id}
              label={d.name}
              active={f.index.includes(d.slug)}
              onClick={() => toggle("index", d.slug)}
            />
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-slate-500 w-16 shrink-0">所属领域</span>
          {fields.map((d) => (
            <Chip
              key={d.id}
              label={d.name}
              active={f.field.includes(d.slug)}
              onClick={() => toggle("field", d.slug)}
            />
          ))}
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={apply}
          className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-colors"
        >
          应用筛选
        </button>
      </div>
    </div>
  );
}
