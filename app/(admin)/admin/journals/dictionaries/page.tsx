"use client";

import { useEffect, useState } from "react";
import { Plus, Save, Trash2, Pencil, X, ShieldAlert, Tags, CheckCircle2 } from "lucide-react";

interface DictRow {
  id: string;
  name: string;
  slug: string;
  sortOrder: number;
  parentId?: string | null;
  parent?: { id: string; name: string } | null;
}

interface FormState {
  name: string;
  slug: string;
  sortOrder: number;
  parentId: string;
}

const emptyForm = (sortOrder: number): FormState => ({
  name: "",
  slug: "",
  sortOrder,
  parentId: "",
});

function DictManager({
  endpoint,
  title,
  description,
  withParent,
}: {
  endpoint: string;
  title: string;
  description: string;
  withParent?: boolean;
}) {
  const [rows, setRows] = useState<DictRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<DictRow | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm(0));
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/v1/admin/${endpoint}`);
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok) throw new Error(data.message || "加载失败");
        setRows(data.data || []);
        setError("");
      } catch (err: unknown) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "网络异常");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [endpoint, refreshKey]);

  const startAdd = () => {
    setEditing(null);
    setForm(emptyForm(rows.length));
    setAdding(true);
  };

  const startEdit = (row: DictRow) => {
    setEditing(row);
    setForm({ name: row.name, slug: row.slug, sortOrder: row.sortOrder, parentId: row.parentId ?? "" });
    setAdding(false);
  };

  const cancel = () => {
    setAdding(false);
    setEditing(null);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setMsg("");
    const payload = {
      name: form.name,
      slug: form.slug,
      sortOrder: Number(form.sortOrder) || 0,
      ...(withParent ? { parentId: form.parentId || null } : {}),
    };
    const url = editing ? `/api/v1/admin/${endpoint}/${editing.id}` : `/api/v1/admin/${endpoint}`;
    const method = editing ? "PUT" : "POST";
    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "保存失败");
      setMsg(editing ? "更新成功" : "创建成功");
      cancel();
      setLoading(true);
      setRefreshKey((k) => k + 1);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "保存失败");
    }
  };

  const remove = async (row: DictRow) => {
    if (!confirm(`确定要删除「${row.name}」吗？`)) return;
    setError("");
    setMsg("");
    try {
      const res = await fetch(`/api/v1/admin/${endpoint}/${row.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "删除失败");
      setMsg("删除成功");
      setLoading(true);
      setRefreshKey((k) => k + 1);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "删除失败");
    }
  };

  const inputCls =
    "w-full px-3 py-2 bg-slate-950/80 border border-slate-800 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-blue-500";

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden">
      <div className="px-6 py-4 flex items-center justify-between border-b border-slate-800">
        <div>
          <h3 className="text-sm font-bold text-blue-400">{title}</h3>
          <p className="text-[11px] text-slate-500 mt-0.5">{description}</p>
        </div>
        <button
          type="button"
          onClick={startAdd}
          className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium transition-colors cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          新增
        </button>
      </div>

      {error && (
        <div className="m-4 p-3 rounded-xl bg-red-950/50 border border-red-800/60 text-red-300 text-xs flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-red-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {msg && (
        <div className="m-4 p-3 rounded-xl bg-emerald-950/50 border border-emerald-800/60 text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{msg}</span>
        </div>
      )}

      {(adding || editing) && (
        <form onSubmit={submit} className="m-4 p-4 bg-slate-950/60 border border-slate-800 rounded-xl space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] text-slate-400 mb-1">名称 *</label>
              <input
                required
                className={inputCls}
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="例: 中国知网"
              />
            </div>
            <div>
              <label className="block text-[11px] text-slate-400 mb-1">Slug *</label>
              <input
                required
                className={`${inputCls} font-mono`}
                value={form.slug}
                onChange={(e) => setForm({ ...form, slug: e.target.value })}
                placeholder="例: cnki"
              />
            </div>
            <div>
              <label className="block text-[11px] text-slate-400 mb-1">排序权重</label>
              <input
                type="number"
                className={inputCls}
                value={form.sortOrder}
                onChange={(e) => setForm({ ...form, sortOrder: Number(e.target.value) || 0 })}
              />
            </div>
            {withParent && (
              <div className="md:col-span-3">
                <label className="block text-[11px] text-slate-400 mb-1">上级领域（可选）</label>
                <select
                  className={inputCls}
                  value={form.parentId}
                  onChange={(e) => setForm({ ...form, parentId: e.target.value })}
                >
                  <option value="">无（作为顶级领域）</option>
                  {rows
                    .filter((r) => r.id !== editing?.id)
                    .map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                </select>
              </div>
            )}
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={cancel}
              className="inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
              取消
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium transition-colors cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              {editing ? "保存修改" : "创建"}
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="p-8 text-center text-slate-500 text-xs">加载中...</div>
      ) : rows.length === 0 ? (
        <div className="p-8 text-center text-slate-500 text-xs">暂无数据</div>
      ) : (
        <table className="w-full text-left text-xs text-slate-300">
          <thead className="bg-slate-950/80 text-slate-500 uppercase text-[10px] font-semibold border-b border-slate-800">
            <tr>
              <th className="px-6 py-3">名称</th>
              <th className="px-6 py-3">Slug</th>
              {withParent && <th className="px-6 py-3">上级领域</th>}
              <th className="px-6 py-3">排序</th>
              <th className="px-6 py-3 text-right">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {rows.map((row) => (
              <tr key={row.id} className="hover:bg-slate-800/30 transition-colors">
                <td className="px-6 py-3 text-slate-200 font-medium">{row.name}</td>
                <td className="px-6 py-3 font-mono text-slate-400">{row.slug}</td>
                {withParent && (
                  <td className="px-6 py-3 text-slate-400">{row.parent?.name ?? "—"}</td>
                )}
                <td className="px-6 py-3 text-slate-400">{row.sortOrder}</td>
                <td className="px-6 py-3 text-right space-x-2">
                  <button
                    type="button"
                    onClick={() => startEdit(row)}
                    className="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
                  >
                    <Pencil className="w-3 h-3" />
                    编辑
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(row)}
                    className="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-lg bg-red-950/60 hover:bg-red-900/60 text-red-400 border border-red-900/40 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3 h-3" />
                    删除
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

const tabs = [
  { key: "indexing", label: "收录网站", endpoint: "indexing-databases", title: "收录网站字典", description: "期刊被收录的数据库 / 网站（知网、维普、万方等），被期刊关联后不可删除", withParent: false },
  { key: "format", label: "期刊形式", endpoint: "journal-formats", title: "期刊形式字典", description: "电子刊 / 国际刊 / 纸质刊等，被期刊关联后不可删除", withParent: false },
  { key: "index", label: "核心/收录类型", endpoint: "journal-indexes", title: "核心/收录类型字典", description: "北大核心、CSSCI、EI、SCI 等，被期刊关联后不可删除", withParent: false },
  { key: "field", label: "所属领域", endpoint: "fields", title: "所属领域字典", description: "支持两级层级，含子领域或已被期刊关联时不可删除", withParent: true },
];

export default function JournalDictionariesPage() {
  const [active, setActive] = useState("indexing");
  const current = tabs.find((t) => t.key === active)!;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
          <Tags className="w-6 h-6 text-blue-400" />
          <span>期刊属性字典</span>
        </h1>
        <p className="text-slate-400 text-sm mt-1">
          维护收录网站、期刊形式、核心/收录类型与所属领域，供期刊录入与筛选使用。
        </p>
      </div>

      <div className="flex flex-wrap gap-1 bg-slate-900/60 border border-slate-800 p-1 rounded-xl w-fit">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActive(tab.key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
              active === tab.key
                ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <DictManager
        endpoint={current.endpoint}
        title={current.title}
        description={current.description}
        withParent={current.withParent}
      />
    </div>
  );
}
