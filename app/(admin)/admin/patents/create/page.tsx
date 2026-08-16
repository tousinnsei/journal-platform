"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Save,
  ShieldAlert,
  CheckCircle2,
  BadgeDollarSign,
  Plus,
  Trash2,
} from "lucide-react";
import { useAuth } from "@/lib/use-auth";

interface SourceRow {
  key: number;
  sourceName: string;
  contactName: string;
  costPrice: string;
  salePrice: string;
  currency: string;
  status: "ACTIVE" | "DISABLED";
}

export default function CreatePatentPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [note, setNote] = useState("");
  const [type, setType] = useState<"INVENTION" | "UTILITY_MODEL" | "DESIGN">("INVENTION");
  const [status, setStatus] = useState<"DRAFT" | "PENDING">("DRAFT");

  const [sources, setSources] = useState<SourceRow[]>([
    { key: 0, sourceName: "", contactName: "", costPrice: "", salePrice: "", currency: "CNY", status: "ACTIVE" },
  ]);

  const updateSource = (key: number, patch: Partial<SourceRow>) => {
    setSources((prev) => prev.map((s) => (s.key === key ? { ...s, ...patch } : s)));
  };

  const addSource = () => {
    setSources((prev) => [
      ...prev,
      { key: Date.now() + Math.random(), sourceName: "", contactName: "", costPrice: "", salePrice: "", currency: "CNY", status: "ACTIVE" },
    ]);
  };

  const removeSource = (key: number) => {
    setSources((prev) => prev.filter((s) => s.key !== key));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");
    setLoading(true);

    try {
      const payload = {
        name,
        description: description || undefined,
        note: note || undefined,
        type,
        status,
        sources: sources
          .filter((s) => s.sourceName.trim() !== "")
          .map((s) => ({
            sourceName: s.sourceName,
            contactName: s.contactName || null,
            costPrice: s.costPrice !== "" ? Number(s.costPrice) : null,
            salePrice: Number(s.salePrice),
            currency: s.currency.trim().toUpperCase(),
            status: s.status,
          })),
      };

      const res = await fetch("/api/v1/admin/patents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "创建专利失败");

      setSuccessMsg("专利创建成功！正在跳转至列表...");
      setTimeout(() => {
        router.push("/admin/patents");
        router.refresh();
      }, 1200);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "网络异常");
    } finally {
      setLoading(false);
    }
  };

  const section = "bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-4";
  const sectionTitle = "text-sm font-bold text-blue-400 uppercase tracking-wider";
  const inputCls =
    "w-full px-3.5 py-2 bg-slate-950/80 border border-slate-800 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-blue-500";
  const labelCls = "block text-xs text-slate-300 mb-1";

  if (user && user.role !== "SUPER_ADMIN" && user.role !== "EDITOR") {
    return null;
  }

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
        <h1 className="text-xl font-bold text-white">新增专利录入表单</h1>
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
              <label className={labelCls}>专利名称 *</label>
              <input type="text" required value={name} onChange={(e) => setName(e.target.value)} placeholder="例: 一种基于深度学习的缺陷检测方法" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>专利类型</label>
              <select value={type} onChange={(e) => setType(e.target.value as "INVENTION" | "UTILITY_MODEL" | "DESIGN")} className={inputCls}>
                <option value="INVENTION">发明专利 (INVENTION)</option>
                <option value="UTILITY_MODEL">实用新型 (UTILITY_MODEL)</option>
                <option value="DESIGN">外观设计 (DESIGN)</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>保存状态选择</label>
              <select value={status} onChange={(e) => setStatus(e.target.value as "DRAFT" | "PENDING")} className={inputCls}>
                <option value="DRAFT">存为草稿 (Draft)</option>
                <option value="PENDING">提交审核 (Pending Audit)</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className={labelCls}>专利简介</label>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className={inputCls} />
            </div>
            <div className="md:col-span-2">
              <label className={labelCls}>备注</label>
              <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} className={inputCls} />
            </div>
          </div>
        </div>

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

          <div className="space-y-3">
            {sources.map((s, idx) => (
              <div key={s.key} className="border border-slate-800 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-slate-500 font-mono">渠道 #{idx + 1}</span>
                  <button
                    type="button"
                    onClick={() => removeSource(s.key)}
                    disabled={sources.length <= 1}
                    className="text-[11px] text-red-400 hover:text-red-300 inline-flex items-center gap-1 disabled:opacity-30 cursor-pointer"
                  >
                    <Trash2 className="w-3 h-3" />
                    移除
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  <div>
                    <label className={labelCls}>渠道名称 *</label>
                    <input type="text" required value={s.sourceName} onChange={(e) => updateSource(s.key, { sourceName: e.target.value })} placeholder="例: 代理机构A" className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>联系人</label>
                    <input type="text" value={s.contactName} onChange={(e) => updateSource(s.key, { contactName: e.target.value })} placeholder="内部联系人（可选）" className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>渠道状态</label>
                    <select value={s.status} onChange={(e) => updateSource(s.key, { status: e.target.value as SourceRow["status"] })} className={inputCls}>
                      <option value="ACTIVE">启用</option>
                      <option value="DISABLED">停用</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>渠道价格（成本）</label>
                    <input type="number" min="0" step="1" value={s.costPrice} onChange={(e) => updateSource(s.key, { costPrice: e.target.value })} placeholder="内部成本（不对外展示）" className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>售卖价格 *</label>
                    <input type="number" min="0" step="1" required value={s.salePrice} onChange={(e) => updateSource(s.key, { salePrice: e.target.value })} placeholder="例: 8500" className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>货币代码 *</label>
                    <input type="text" required maxLength={8} value={s.currency} onChange={(e) => updateSource(s.key, { currency: e.target.value })} placeholder="CNY" className={`${inputCls} font-mono uppercase`} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between bg-slate-900/60 border border-slate-800 rounded-2xl p-6">
          <span className="text-xs text-slate-500">提交后将按所选状态保存专利。</span>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-medium text-sm rounded-xl shadow-lg shadow-blue-600/30 flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{loading ? "正在保存..." : "提交并保存"}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
