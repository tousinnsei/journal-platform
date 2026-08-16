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
} from "lucide-react";
import { useAuth } from "@/lib/use-auth";

interface Source {
  id: string;
  sourceName: string;
  contactName: string | null;
  costPrice: number | null;
  salePrice: number;
  currency: string;
  status: "ACTIVE" | "DISABLED";
}

interface CopyrightDetail {
  id: string;
  name: string;
  shortName: string | null;
  registrationNo: string | null;
  copyrightOwner: string | null;
  description: string | null;
  note: string | null;
  type: "URGENT" | "NORMAL";
  status: "DRAFT" | "PENDING" | "PUBLISHED" | "REJECTED";
  createdById: string | null;
  sources: Source[];
}

interface SourceRow {
  id?: string;
  sourceName: string;
  contactName: string;
  costPrice: string;
  salePrice: string;
  currency: string;
  status: "ACTIVE" | "DISABLED";
  isNew: boolean;
}

export default function EditCopyrightPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const [name, setName] = useState("");
  const [shortName, setShortName] = useState("");
  const [registrationNo, setRegistrationNo] = useState("");
  const [copyrightOwner, setCopyrightOwner] = useState("");
  const [description, setDescription] = useState("");
  const [note, setNote] = useState("");
  const [type, setType] = useState<"URGENT" | "NORMAL">("NORMAL");
  const [status, setStatus] = useState<"DRAFT" | "PENDING" | "PUBLISHED" | "REJECTED">("DRAFT");
  const [ownerId, setOwnerId] = useState<string | null>(null);

  const [sources, setSources] = useState<SourceRow[]>([]);
  const [sourceSaving, setSourceSaving] = useState(false);
  const [sourceMsg, setSourceMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/v1/admin/software-copyrights/${id}`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        const c = (data as { data?: CopyrightDetail }).data;
        if (c) {
          setName(c.name || "");
          setShortName(c.shortName || "");
          setRegistrationNo(c.registrationNo || "");
          setCopyrightOwner(c.copyrightOwner || "");
          setDescription(c.description || "");
          setNote(c.note || "");
          setType(c.type || "NORMAL");
          setStatus(c.status || "DRAFT");
          setOwnerId(c.createdById || null);
          setSources(
            (c.sources || []).map((s) => ({
              id: s.id,
              sourceName: s.sourceName,
              contactName: s.contactName || "",
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

  const reloadSources = async () => {
    const res = await fetch(`/api/v1/admin/software-copyrights/${id}`);
    const data = await res.json();
    const c = (data as { data?: CopyrightDetail }).data;
    if (c) {
      setSources(
        (c.sources || []).map((s) => ({
          id: s.id,
          sourceName: s.sourceName,
          contactName: s.contactName || "",
          costPrice: s.costPrice != null ? String(s.costPrice) : "",
          salePrice: String(s.salePrice),
          currency: s.currency,
          status: s.status,
          isNew: false,
        }))
      );
    }
  };

  const updateSource = (row: SourceRow, patch: Partial<SourceRow>) => {
    setSources((prev) => prev.map((s) => (s === row ? { ...s, ...patch } : s)));
  };

  const addSource = () => {
    setSources((prev) => [
      ...prev,
      { sourceName: "", contactName: "", costPrice: "", salePrice: "", currency: "CNY", status: "ACTIVE", isNew: true },
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
        costPrice: row.costPrice !== "" ? Number(row.costPrice) : null,
        salePrice: Number(row.salePrice),
        currency: row.currency.trim().toUpperCase(),
        status: row.status,
      });
      const res = await fetch(
        row.isNew ? `/api/v1/admin/software-copyrights/${id}/sources` : `/api/v1/admin/software-copyrights/${id}/sources/${row.id}`,
        { method: row.isNew ? "POST" : "PUT", headers: { "Content-Type": "application/json" }, body }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "渠道保存失败");
      setSourceMsg({ type: "success", text: data.message || "资源渠道已保存" });
      await reloadSources();
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
      const res = await fetch(`/api/v1/admin/software-copyrights/${id}/sources/${row.id}`, { method: "DELETE" });
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
    setSubmitting(true);
    try {
      const payload = {
        name,
        shortName: shortName || undefined,
        registrationNo: registrationNo || undefined,
        copyrightOwner: copyrightOwner || undefined,
        description: description || undefined,
        note: note || undefined,
        type,
        status,
      };
      const res = await fetch(`/api/v1/admin/software-copyrights/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "更新软著失败");
      setSuccessMsg("软著信息更新成功！");
      setTimeout(() => {
        router.push("/admin/software-copyrights");
        router.refresh();
      }, 1000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "更新失败");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || authLoading) {
    return (
      <div className="p-12 text-center text-slate-500 text-sm space-y-3">
        <div className="w-6 h-6 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mx-auto" />
        <p>正在读取软著数据...</p>
      </div>
    );
  }

  const canEdit = user?.role === "SUPER_ADMIN" || (user?.role === "EDITOR" && user.id === ownerId);

  if (!user || !canEdit) {
    return (
      <div className="p-12 text-center text-slate-400 text-sm space-y-3">
        <ShieldX className="w-8 h-8 text-red-400 mx-auto" />
        <p>仅软著创建者本人或超级管理员可编辑该软著</p>
        <button
          onClick={() => router.push("/admin/software-copyrights")}
          className="inline-flex items-center gap-1.5 text-xs text-blue-400 hover:underline cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          返回软著列表
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
        <h1 className="text-xl font-bold text-white">编辑软著详情</h1>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-950/50 border border-red-800/60 text-red-300 text-sm flex items-center gap-3">
          <ShieldAlert className="w-5 h-5 text-red-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-950/50 border border-emerald-800/60 text-emerald-300 text-sm flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className={section}>
          <h2 className={sectionTitle}>1. 基本信息</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>软著全称 *</label>
              <input type="text" required value={name} onChange={(e) => setName(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>软件简称</label>
              <input type="text" value={shortName} onChange={(e) => setShortName(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>登记号</label>
              <input type="text" value={registrationNo} onChange={(e) => setRegistrationNo(e.target.value)} className={`${inputCls} font-mono`} />
            </div>
            <div>
              <label className={labelCls}>著作权人</label>
              <input type="text" value={copyrightOwner} onChange={(e) => setCopyrightOwner(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>办理类型</label>
              <select value={type} onChange={(e) => setType(e.target.value as "URGENT" | "NORMAL")} className={inputCls}>
                <option value="NORMAL">普通 (NORMAL)</option>
                <option value="URGENT">加急 (URGENT)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">当前状态</label>
              <span className="text-xs text-slate-300">{status}</span>
            </div>
            <div className="md:col-span-2">
              <label className={labelCls}>软件简介</label>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className={inputCls} />
            </div>
            <div className="md:col-span-2">
              <label className={labelCls}>备注</label>
              <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} className={inputCls} />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between bg-slate-900/60 border border-slate-800 rounded-2xl p-6">
          <span className="text-xs text-slate-500">保存软著基本信息。</span>
          <button
            type="submit"
            disabled={submitting}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-medium text-sm rounded-xl shadow-lg shadow-blue-600/30 flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{submitting ? "正在保存..." : "保存软著更新"}</span>
          </button>
        </div>
      </form>

      <div className={section}>
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-2">
            <BadgeDollarSign className="w-5 h-5" />
            2. 资源渠道与价格
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
            {sourceMsg.type === "success" ? <CheckCircle2 className="w-4 h-4" /> : <ShieldAlert className="w-4 h-4" />}
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
                  <input type="text" value={row.sourceName} onChange={(e) => updateSource(row, { sourceName: e.target.value })} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>联系人</label>
                  <input type="text" value={row.contactName} onChange={(e) => updateSource(row, { contactName: e.target.value })} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>渠道状态</label>
                  <select value={row.status} onChange={(e) => updateSource(row, { status: e.target.value as SourceRow["status"] })} className={inputCls}>
                    <option value="ACTIVE">启用</option>
                    <option value="DISABLED">停用</option>
                  </select>
                </div>
                <div>
                  <label className={labelCls}>渠道价格（成本）</label>
                  <input type="number" min="0" step="1" value={row.costPrice} onChange={(e) => updateSource(row, { costPrice: e.target.value })} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>售卖价格 *</label>
                  <input type="number" min="0" step="1" value={row.salePrice} onChange={(e) => updateSource(row, { salePrice: e.target.value })} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>货币代码 *</label>
                  <input type="text" maxLength={8} value={row.currency} onChange={(e) => updateSource(row, { currency: e.target.value })} className={`${inputCls} font-mono uppercase`} />
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
