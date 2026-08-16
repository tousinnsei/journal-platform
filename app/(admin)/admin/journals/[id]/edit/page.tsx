"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Save,
  ShieldAlert,
  CheckCircle2,
  ShieldX,
  BadgeDollarSign,
  Plus,
  Trash2,
  Link2,
} from "lucide-react";
import { useAuth } from "@/lib/use-auth";
import { JournalAttributePicker } from "../../journal-attribute-picker";

interface Option {
  id: string;
  name: string;
}

interface JournalLink {
  database?: Option;
  format?: Option;
  index?: Option;
  field?: Option;
}

interface Source {
  id: string;
  sourceName: string;
  contactName: string | null;
  contactNickname: string | null;
  contactPhone: string | null;
  contactWechat: string | null;
  contactEmail: string | null;
  contactNote: string | null;
  costPrice: number | null;
  salePrice: number;
  currency: string;
  status: "ACTIVE" | "DISABLED";
  sortOrder: number;
}

interface JournalDetail {
  id: string;
  title: string;
  description: string | null;
  publisher: { id: string; name: string };
  level: "ORDINARY" | "CORE";
  status: "DRAFT" | "PENDING" | "PUBLISHED" | "REJECTED";
  createdById: string | null;
  indexingDatabases: JournalLink[];
  formats: JournalLink[];
  indexes: JournalLink[];
  fields: JournalLink[];
  minSalePrice: number | null;
  minCostPrice: number | null;
  currency: string;
  sources: Source[];
}

interface SourceRow {
  id?: string;
  sourceName: string;
  contactName: string;
  contactNickname: string;
  contactPhone: string;
  contactWechat: string;
  contactEmail: string;
  contactNote: string;
  costPrice: string;
  salePrice: string;
  currency: string;
  status: "ACTIVE" | "DISABLED";
  isNew: boolean;
}

const pick = (links: JournalLink[]) =>
  links.map((l) => (l.database?.id ?? l.format?.id ?? l.index?.id ?? l.field?.id ?? "")).filter(Boolean);

export default function EditJournalPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [options, setOptions] = useState<{
    publishers: Option[];
    indexingDatabases: Option[];
    formats: Option[];
    indexes: Option[];
    fields: Option[];
  }>({ publishers: [], indexingDatabases: [], formats: [], indexes: [], fields: [] });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [duplicate, setDuplicate] = useState<{ existingId: string; message: string } | null>(null);

  const [title, setTitle] = useState("");
  const [publisherName, setPublisherName] = useState("");
  const [description, setDescription] = useState("");
  const [level, setLevel] = useState<"ORDINARY" | "CORE">("ORDINARY");
  const [status, setStatus] = useState<"DRAFT" | "PENDING" | "PUBLISHED" | "REJECTED">("DRAFT");
  const [journalOwnerId, setJournalOwnerId] = useState<string | null>(null);

  const [selectedIndexingIds, setSelectedIndexingIds] = useState<string[]>([]);
  const [selectedFormatIds, setSelectedFormatIds] = useState<string[]>([]);
  const [selectedIndexIds, setSelectedIndexIds] = useState<string[]>([]);
  const [selectedFieldIds, setSelectedFieldIds] = useState<string[]>([]);

  const [sources, setSources] = useState<SourceRow[]>([]);
  const [sourceSaving, setSourceSaving] = useState(false);
  const [sourceMsg, setSourceMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetch("/api/v1/admin/publishers").then((r) => r.json()),
      fetch("/api/v1/admin/indexing-databases").then((r) => r.json()),
      fetch("/api/v1/admin/journal-formats").then((r) => r.json()),
      fetch("/api/v1/admin/journal-indexes").then((r) => r.json()),
      fetch("/api/v1/admin/fields").then((r) => r.json()),
      fetch(`/api/v1/admin/journals/${id}`).then((r) => r.json()),
    ]).then(([pub, idx, fmt, ix, fld, journalData]) => {
      if (cancelled) return;
      const list = (d: unknown) => (Array.isArray(d) ? d : (d as { data?: unknown })?.data ?? []);
      setOptions({
        publishers: list(pub.data ?? pub) as Option[],
        indexingDatabases: list(idx.data ?? idx) as Option[],
        formats: list(fmt.data ?? fmt) as Option[],
        indexes: list(ix.data ?? ix) as Option[],
        fields: list(fld.data ?? fld) as Option[],
      });

      const j = (journalData as { data?: JournalDetail }).data;
      if (j) {
        setTitle(j.title || "");
        setPublisherName(j.publisher?.name || "");
        setDescription(j.description || "");
        setLevel(j.level || "ORDINARY");
        setStatus(j.status || "DRAFT");
        setJournalOwnerId(j.createdById || null);
        setSelectedIndexingIds(pick(j.indexingDatabases || []));
        setSelectedFormatIds(pick(j.formats || []));
        setSelectedIndexIds(pick(j.indexes || []));
        setSelectedFieldIds(pick(j.fields || []));
        setSources(
          (j.sources || []).map((s) => ({
            id: s.id,
            sourceName: s.sourceName,
            contactName: s.contactName || "",
            contactNickname: s.contactNickname || "",
            contactPhone: s.contactPhone || "",
            contactWechat: s.contactWechat || "",
            contactEmail: s.contactEmail || "",
            contactNote: s.contactNote || "",
            costPrice: s.costPrice != null ? String(s.costPrice) : "",
            salePrice: String(s.salePrice),
            currency: s.currency,
            status: s.status,
            isNew: false,
          }))
        );
      }
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [id]);

  const updateSource = (row: SourceRow, patch: Partial<SourceRow>) => {
    setSources((prev) => prev.map((s) => (s === row ? { ...s, ...patch } : s)));
  };

  const addSource = () => {
    setSources((prev) => [
      ...prev,
      {
        sourceName: "",
        contactName: "",
        contactNickname: "",
        contactPhone: "",
        contactWechat: "",
        contactEmail: "",
        contactNote: "",
        costPrice: "",
        salePrice: "",
        currency: "CNY",
        status: "ACTIVE",
        isNew: true,
      },
    ]);
  };

  const handleSourceSubmit = async (row: SourceRow) => {
    setSourceMsg(null);
    if (row.sourceName.trim() === "") {
      setSourceMsg({ type: "error", text: "渠道名称不能为空" });
      return;
    }
    if (row.salePrice === "" || isNaN(Number(row.salePrice)) || Number(row.salePrice) < 0) {
      setSourceMsg({ type: "error", text: "售卖价格必须为不小于 0 的合法数字" });
      return;
    }
    setSourceSaving(true);
    try {
      const body = JSON.stringify({
        sourceName: row.sourceName,
        contactName: row.contactName || null,
        contactNickname: row.contactNickname || null,
        contactPhone: row.contactPhone || null,
        contactWechat: row.contactWechat || null,
        contactEmail: row.contactEmail || null,
        contactNote: row.contactNote || null,
        costPrice: row.costPrice !== "" ? Number(row.costPrice) : null,
        salePrice: Number(row.salePrice),
        currency: row.currency.trim().toUpperCase(),
        status: row.status,
      });
      const res = await fetch(
        row.isNew ? `/api/v1/admin/journals/${id}/sources` : `/api/v1/admin/journals/${id}/sources/${row.id}`,
        { method: row.isNew ? "POST" : "PUT", headers: { "Content-Type": "application/json" }, body }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "渠道保存失败");
      setSourceMsg({ type: "success", text: data.message || "资源渠道已保存" });
      const fresh = await fetch(`/api/v1/admin/journals/${id}`).then((r) => r.json());
      const j = (fresh as { data?: JournalDetail }).data;
      if (j) {
        setSources(
          (j.sources || []).map((s) => ({
            id: s.id,
            sourceName: s.sourceName,
            contactName: s.contactName || "",
            contactNickname: s.contactNickname || "",
            contactPhone: s.contactPhone || "",
            contactWechat: s.contactWechat || "",
            contactEmail: s.contactEmail || "",
            contactNote: s.contactNote || "",
            costPrice: s.costPrice != null ? String(s.costPrice) : "",
            salePrice: String(s.salePrice),
            currency: s.currency,
            status: s.status,
            isNew: false,
          }))
        );
      }
    } catch (err: unknown) {
      setSourceMsg({ type: "error", text: err instanceof Error ? err.message : "渠道保存失败" });
    } finally {
      setSourceSaving(false);
    }
  };

  const handleSourceDelete = async (row: SourceRow) => {
    if (row.isNew) {
      setSources((prev) => prev.filter((s) => s !== row));
      return;
    }
    if (!confirm(`确定要删除渠道「${row.sourceName}」吗？`)) return;
    setSourceMsg(null);
    setSourceSaving(true);
    try {
      const res = await fetch(`/api/v1/admin/journals/${id}/sources/${row.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "渠道删除失败");
      setSources((prev) => prev.filter((s) => s !== row));
      setSourceMsg({ type: "success", text: data.message || "资源渠道已删除" });
    } catch (err: unknown) {
      setSourceMsg({ type: "error", text: err instanceof Error ? err.message : "渠道删除失败" });
    } finally {
      setSourceSaving(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");
    setDuplicate(null);
    setSubmitting(true);

    try {
      const payload = {
        title,
        publisherName,
        description: description || undefined,
        level,
        status,
        indexingDatabaseIds: selectedIndexingIds,
        formatIds: selectedFormatIds,
        indexIds: selectedIndexIds,
        fieldIds: selectedFieldIds,
      };

      const res = await fetch(`/api/v1/admin/journals/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.status === 409 && data.data?.existingId) {
        setDuplicate({ existingId: data.data.existingId, message: data.message || "该期刊已经存在" });
        throw new Error(data.message || "该期刊已经存在");
      }
      if (!res.ok) throw new Error(data.message || "更新期刊失败");

      setSuccessMsg("期刊信息更新成功！");
      setTimeout(() => {
        router.push("/admin/journals");
        router.refresh();
      }, 1000);
    } catch (err: unknown) {
      if (!(err instanceof Error)) return;
      if (!duplicate) setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || authLoading) {
    return (
      <div className="p-12 text-center text-slate-500 text-sm space-y-3">
        <div className="w-6 h-6 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mx-auto" />
        <p>正在读取期刊数据...</p>
      </div>
    );
  }

  const canEdit = user?.role === "SUPER_ADMIN" || (user?.role === "EDITOR" && user.id === journalOwnerId);

  if (!user || !canEdit) {
    return (
      <div className="p-12 text-center text-slate-400 text-sm space-y-3">
        <ShieldX className="w-8 h-8 text-red-400 mx-auto" />
        <p>仅期刊创建者本人或超级管理员可编辑该期刊</p>
        <button
          onClick={() => router.push("/admin/journals")}
          className="inline-flex items-center gap-1.5 text-xs text-blue-400 hover:underline cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          返回期刊列表
        </button>
      </div>
    );
  }

  const section = "bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-4";
  const sectionTitle = "text-sm font-bold text-blue-400 uppercase tracking-wider";
  const inputCls =
    "w-full px-3.5 py-2 bg-slate-950/80 border border-slate-800 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-blue-500";
  const labelCls = "block text-xs text-slate-300 mb-1";

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <button
          onClick={() => router.back()}
          className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>返回列表</span>
        </button>
        <h1 className="text-xl font-bold text-white">编辑期刊详情</h1>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-950/50 border border-red-800/60 text-red-300 text-sm flex items-center gap-3">
          <ShieldAlert className="w-5 h-5 text-red-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {duplicate && (
        <div className="p-4 rounded-xl bg-amber-950/50 border border-amber-800/60 text-amber-200 text-sm flex items-center justify-between gap-3">
          <span className="flex items-center gap-2">
            <Link2 className="w-4 h-4 text-amber-400 shrink-0" />
            {duplicate.message}。是否进入现有期刊并新增资源渠道？
          </span>
          <button
            type="button"
            onClick={() => router.push(`/admin/journals/${duplicate.existingId}/edit`)}
            className="shrink-0 px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-medium transition-colors cursor-pointer"
          >
            进入现有期刊
          </button>
        </div>
      )}

      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-950/50 border border-emerald-800/60 text-emerald-300 text-sm flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 1. 基本信息 */}
        <div className={section}>
          <h2 className={sectionTitle}>1. 基本信息</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>期刊名称 *</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>出版社名称 *</label>
              <input
                type="text"
                required
                list="publisher-options"
                value={publisherName}
                onChange={(e) => setPublisherName(e.target.value)}
                className={inputCls}
              />
              <datalist id="publisher-options">
                {options.publishers.map((p) => (
                  <option key={p.id} value={p.name} />
                ))}
              </datalist>
            </div>
            <div className="md:col-span-2">
              <label className={labelCls}>期刊简介</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className={inputCls}
              />
            </div>
          </div>
        </div>

        {/* 2. 期刊级别 */}
        <div className={section}>
          <h2 className={sectionTitle}>2. 期刊级别</h2>
          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
              <input
                type="radio"
                name="level"
                value="CORE"
                checked={level === "CORE"}
                onChange={() => setLevel("CORE")}
                className="text-amber-500"
              />
              <span className="font-medium text-amber-400">核心 (CORE)</span>
            </label>
            <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
              <input
                type="radio"
                name="level"
                value="ORDINARY"
                checked={level === "ORDINARY"}
                onChange={() => setLevel("ORDINARY")}
                className="text-slate-500"
              />
              <span className="text-slate-400">普通 (ORDINARY)</span>
            </label>
          </div>
        </div>

        {/* 3. 收录网站 */}
        <div className={section}>
          <h2 className={sectionTitle}>3. 收录网站</h2>
          <JournalAttributePicker
            label="选择该期刊被收录的数据库/网站（可多选）"
            options={options.indexingDatabases}
            selectedIds={selectedIndexingIds}
            onChange={setSelectedIndexingIds}
          />
        </div>

        {/* 4. 期刊形式 */}
        <div className={section}>
          <h2 className={sectionTitle}>4. 期刊形式</h2>
          <JournalAttributePicker
            label="选择期刊形式（可多选）"
            options={options.formats}
            selectedIds={selectedFormatIds}
            onChange={setSelectedFormatIds}
          />
        </div>

        {/* 5. 核心/收录类型 */}
        <div className={section}>
          <h2 className={sectionTitle}>5. 核心/收录类型</h2>
          <JournalAttributePicker
            label="选择核心/收录类型（可多选）"
            options={options.indexes}
            selectedIds={selectedIndexIds}
            onChange={setSelectedIndexIds}
          />
        </div>

        {/* 6. 所属领域 */}
        <div className={section}>
          <h2 className={sectionTitle}>6. 所属领域</h2>
          <JournalAttributePicker
            label="选择所属领域（可多选）"
            options={options.fields}
            selectedIds={selectedFieldIds}
            onChange={setSelectedFieldIds}
          />
        </div>

        {/* 状态与提交 */}
        <div className="flex items-center justify-between bg-slate-900/60 border border-slate-800 rounded-2xl p-6">
          <div>
            <label className="block text-xs text-slate-400 mb-1">当前状态</label>
            <span className="text-xs text-slate-300">{status}</span>
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-medium text-sm rounded-xl shadow-lg shadow-blue-600/30 flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{submitting ? "正在保存..." : "保存期刊更新"}</span>
          </button>
        </div>
      </form>

      {/* 7. 资源渠道 */}
      <div className={section}>
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-2">
            <BadgeDollarSign className="w-5 h-5" />
            资源渠道与价格
          </h2>
          <button
            type="button"
            onClick={addSource}
            className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-emerald-950/60 hover:bg-emerald-900/60 text-emerald-400 border border-emerald-800/60 transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            新增渠道
          </button>
        </div>
        <p className="text-[11px] text-slate-500">
          渠道价格为平台内部成本，永不对外展示；对外展示最低售卖价格。
        </p>

        {sourceMsg && (
          <div
            className={`p-3 rounded-xl text-sm flex items-center gap-2 border ${
              sourceMsg.type === "success"
                ? "bg-emerald-950/50 border-emerald-800/60 text-emerald-300"
                : "bg-red-950/50 border-red-800/60 text-red-300"
            }`}
          >
            {sourceMsg.type === "success" ? (
              <CheckCircle2 className="w-4 h-4" />
            ) : (
              <ShieldAlert className="w-4 h-4" />
            )}
            <span>{sourceMsg.text}</span>
          </div>
        )}

        <div className="space-y-3">
          {sources.map((row, idx) => (
            <div key={row.id ?? `new-${idx}`} className="border border-slate-800 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-slate-500 font-mono">渠道 #{idx + 1}</span>
                <button
                  type="button"
                  onClick={() => handleSourceDelete(row)}
                  className="text-[11px] text-red-400 hover:text-red-300 inline-flex items-center gap-1 cursor-pointer"
                >
                  <Trash2 className="w-3 h-3" />
                  删除
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                <div>
                  <label className={labelCls}>渠道名称 *</label>
                  <input
                    type="text"
                    value={row.sourceName}
                    onChange={(e) => updateSource(row, { sourceName: e.target.value })}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>联系人</label>
                  <input
                    type="text"
                    value={row.contactName}
                    onChange={(e) => updateSource(row, { contactName: e.target.value })}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>联系人昵称</label>
                  <input
                    type="text"
                    value={row.contactNickname}
                    onChange={(e) => updateSource(row, { contactNickname: e.target.value })}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>联系方式</label>
                  <input
                    type="text"
                    value={row.contactPhone}
                    onChange={(e) => updateSource(row, { contactPhone: e.target.value })}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>微信号</label>
                  <input
                    type="text"
                    value={row.contactWechat}
                    onChange={(e) => updateSource(row, { contactWechat: e.target.value })}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>电子邮箱</label>
                  <input
                    type="email"
                    value={row.contactEmail}
                    onChange={(e) => updateSource(row, { contactEmail: e.target.value })}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>渠道状态</label>
                  <select
                    value={row.status}
                    onChange={(e) => updateSource(row, { status: e.target.value as SourceRow["status"] })}
                    className={inputCls}
                  >
                    <option value="ACTIVE">启用</option>
                    <option value="DISABLED">停用</option>
                  </select>
                </div>
                <div>
                  <label className={labelCls}>渠道价格（成本）</label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={row.costPrice}
                    onChange={(e) => updateSource(row, { costPrice: e.target.value })}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>售卖价格 *</label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={row.salePrice}
                    onChange={(e) => updateSource(row, { salePrice: e.target.value })}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>货币代码 *</label>
                  <input
                    type="text"
                    maxLength={8}
                    value={row.currency}
                    onChange={(e) => updateSource(row, { currency: e.target.value })}
                    className={`${inputCls} font-mono uppercase`}
                  />
                </div>
                <div className="md:col-span-2 lg:col-span-3">
                  <label className={labelCls}>备注</label>
                  <input
                    type="text"
                    value={row.contactNote}
                    onChange={(e) => updateSource(row, { contactNote: e.target.value })}
                    className={inputCls}
                  />
                </div>
              </div>
              <div className="flex justify-end">
                <button
                  type="button"
                  disabled={sourceSaving}
                  onClick={() => handleSourceSubmit(row)}
                  className="inline-flex items-center gap-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-sm rounded-xl transition-all cursor-pointer disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  <span>{row.isNew ? "新增渠道" : "保存渠道"}</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
