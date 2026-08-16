"use client";

import { useEffect, useState, type ReactNode } from "react";
import {
  FolderTree,
  Search,
  Plus,
  Edit,
  Trash2,
  ShieldAlert,
  X,
  CheckCircle2,
  ChevronRight,
} from "lucide-react";
import { useAuth } from "@/lib/use-auth";

interface Category {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  sortOrder: number;
  createdAt: string;
  parent: { id: string; name: string } | null;
  children: Category[];
  _count: { journals: number };
}

interface CategoryNode extends Category {
  children: CategoryNode[];
}

interface FormState {
  name: string;
  slug: string;
  parentId: string;
  sortOrder: number;
}

const emptyForm: FormState = { name: "", slug: "", parentId: "", sortOrder: 0 };

export default function AdminCategoriesPage() {
  const { user, loading: authLoading } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        const res = await fetch("/api/v1/admin/categories");
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok) throw new Error(data.message || "获取分类列表失败");
        setCategories(data.data || []);
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

  if (authLoading) {
    return (
      <div className="p-12 text-center text-slate-500 text-sm space-y-3">
        <div className="w-6 h-6 border-2 border-violet-500/30 border-t-violet-500 rounded-full animate-spin mx-auto" />
        <p>正在校验权限...</p>
      </div>
    );
  }

  if (!user || user.role !== "SUPER_ADMIN") {
    return (
      <div className="p-12 text-center text-slate-400 text-sm space-y-3">
        <ShieldAlert className="w-8 h-8 text-red-400 mx-auto" />
        <p>仅超级管理员可管理学科分类</p>
      </div>
    );
  }

  const buildTree = (list: Category[]): CategoryNode[] => {
    const nodes = new Map<string, CategoryNode>(
      list.map((c) => [c.id, { ...c, children: [] }])
    );
    const roots: CategoryNode[] = [];
    nodes.forEach((node) => {
      if (node.parentId && nodes.has(node.parentId)) {
        nodes.get(node.parentId)!.children.push(node);
      } else {
        roots.push(node);
      }
    });
    const sortNodes = (arr: CategoryNode[]) => {
      arr.sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
      arr.forEach((n) => sortNodes(n.children));
    };
    sortNodes(roots);
    return roots;
  };

  const collectIds = (nodes: CategoryNode[]): string[] =>
    nodes.flatMap((n) => [n.id, ...collectIds(n.children)]);

  // For edit: exclude self and all descendants from the parent options
  const unavailableParentIds = new Set<string>();
  if (editing) {
    const tree = buildTree(categories);
    const findNode = (nodes: CategoryNode[], id: string): CategoryNode | null => {
      for (const n of nodes) {
        if (n.id === id) return n;
        const found = findNode(n.children, id);
        if (found) return found;
      }
      return null;
    };
    const self = findNode(tree, editing.id);
    if (self) collectIds([self]).forEach((id) => unavailableParentIds.add(id));
  }

  const filteredTree = buildTree(categories)
    .map((node) => filterNode(node))
    .filter((n): n is CategoryNode => n !== null);

  function filterNode(node: CategoryNode): CategoryNode | null {
    const children = node.children.map(filterNode).filter((c): c is CategoryNode => c !== null);
    const matches =
      !searchQuery ||
      node.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      node.slug.toLowerCase().includes(searchQuery.toLowerCase());
    if (matches || children.length > 0) {
      return { ...node, children };
    }
    return null;
  }

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setNotice("");
    setModalOpen(true);
  };

  const openEdit = (c: Category) => {
    setEditing(c);
    setForm({
      name: c.name,
      slug: c.slug,
      parentId: c.parentId || "",
      sortOrder: c.sortOrder,
    });
    setNotice("");
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setNotice("");
    setSubmitting(true);

    try {
      const payload = {
        name: form.name,
        slug: form.slug,
        parentId: form.parentId || null,
        sortOrder: form.sortOrder,
      };

      const res = await fetch(
        editing ? `/api/v1/admin/categories/${editing.id}` : "/api/v1/admin/categories",
        {
          method: editing ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "保存失败");

      setModalOpen(false);
      setNotice(editing ? "学科分类更新成功" : "学科分类创建成功");
      setRefreshKey((k) => k + 1);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "提交失败");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (c: Category) => {
    if (!confirm(`确定要删除分类「${c.name}」吗？`)) return;
    setError("");
    try {
      const res = await fetch(`/api/v1/admin/categories/${c.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "删除失败");
      setNotice("学科分类删除成功");
      setRefreshKey((k) => k + 1);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "删除失败");
    }
  };

  const renderNode = (node: CategoryNode, depth: number) => (
    <tr key={node.id} className="hover:bg-slate-800/30 transition-colors">
      <td className="px-5 py-3.5">
        <div className="flex items-center gap-2" style={{ paddingLeft: `${depth * 20}px` }}>
          <ChevronRight
            className={`w-4 h-4 shrink-0 ${depth > 0 ? "text-slate-600" : "text-violet-400"}`}
          />
          <span className={`font-medium text-white ${depth > 0 ? "text-slate-300" : ""}`}>
            {node.name}
          </span>
          {depth === 0 && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-violet-950 text-violet-400 border border-violet-800/60">
              根
            </span>
          )}
        </div>
      </td>
      <td className="px-5 py-3.5 font-mono text-xs text-slate-400">{node.slug}</td>
      <td className="px-5 py-3.5 text-xs text-slate-400">
        {node.parent ? node.parent.name : <span className="text-slate-600">-</span>}
      </td>
      <td className="px-5 py-3.5 text-xs text-slate-300">{node.sortOrder}</td>
      <td className="px-5 py-3.5 text-xs text-slate-400">{node._count.journals}</td>
      <td className="px-5 py-3.5 text-right space-x-2">
        <button
          onClick={() => openEdit(node)}
          className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors cursor-pointer"
        >
          <Edit className="w-3.5 h-3.5" />
          <span>编辑</span>
        </button>
        <button
          onClick={() => handleDelete(node)}
          className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg bg-red-950/60 hover:bg-red-900/60 text-red-400 border border-red-900/40 transition-colors cursor-pointer"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>删除</span>
        </button>
      </td>
    </tr>
  );

  const renderNodeList = (nodes: CategoryNode[], depth: number): ReactNode[] =>
    nodes.flatMap((n) => [renderNode(n, depth), ...renderNodeList(n.children, depth + 1)]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <FolderTree className="w-6 h-6 text-violet-400" />
            <span>学科分类管理</span>
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            支持多级父子分类，循环父级将被拒绝，有关联期刊的分类不可删除。
          </p>
        </div>
        <button
          onClick={openCreate}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-xl shadow-lg shadow-blue-600/30 text-sm transition-all shrink-0 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>新增分类</span>
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

      {/* Search Bar */}
      <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-2xl">
        <div className="relative w-full md:w-72">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜分类名称 / Slug..."
            className="w-full pl-10 pr-4 py-2 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500"
          />
        </div>
      </div>

      {/* Tree Table */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        {loading ? (
          <div className="p-12 text-center text-slate-500 text-sm space-y-3">
            <div className="w-6 h-6 border-2 border-violet-500/30 border-t-violet-500 rounded-full animate-spin mx-auto" />
            <p>加载分类数据中...</p>
          </div>
        ) : filteredTree.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-sm">
            暂无匹配的分类记录
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-950/80 text-slate-400 uppercase text-[11px] font-semibold border-b border-slate-800">
                <tr>
                  <th className="px-5 py-4">分类名称（层级）</th>
                  <th className="px-5 py-4">Slug</th>
                  <th className="px-5 py-4">父分类</th>
                  <th className="px-5 py-4">排序</th>
                  <th className="px-5 py-4">期刊数</th>
                  <th className="px-5 py-4 text-right">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {renderNodeList(filteredTree, 0)}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create / Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setModalOpen(false)} />
          <div className="relative w-full max-w-lg bg-slate-900 border border-slate-700 rounded-2xl p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-white">
                {editing ? "编辑学科分类" : "新增学科分类"}
              </h2>
              <button
                onClick={() => setModalOpen(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-red-950/50 border border-red-800/60 text-red-300 text-sm flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-red-400 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs text-slate-300 mb-1">分类名称 *</label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="例如: 计算机科学"
                  className="w-full px-3.5 py-2 bg-slate-950/80 border border-slate-800 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-300 mb-1">Slug 标识 *</label>
                <input
                  type="text"
                  required
                  value={form.slug}
                  onChange={(e) => setForm({ ...form, slug: e.target.value })}
                  placeholder="例如: computer-science"
                  className="w-full px-3.5 py-2 bg-slate-950/80 border border-slate-800 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-blue-500 font-mono"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-300 mb-1">父分类</label>
                <select
                  value={form.parentId}
                  onChange={(e) => setForm({ ...form, parentId: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-950/80 border border-slate-800 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-blue-500"
                >
                  <option value="">无（作为根分类）</option>
                  {categories
                    .filter((c) => !unavailableParentIds.has(c.id))
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-300 mb-1">排序值（越小越靠前）</label>
                <input
                  type="number"
                  value={form.sortOrder}
                  onChange={(e) => setForm({ ...form, sortOrder: Number(e.target.value) })}
                  className="w-full px-3.5 py-2 bg-slate-950/80 border border-slate-800 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm cursor-pointer"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-medium text-sm rounded-xl shadow-lg shadow-blue-600/25 flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                >
                  <Plus className="w-4 h-4" />
                  <span>{submitting ? "正在保存..." : "保存"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
