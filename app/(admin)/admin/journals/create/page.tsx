"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Save,
  ShieldAlert,
  CheckCircle2,
  BadgeDollarSign,
  Plus,
  Trash2,
  Link2,
  Tag,
} from "lucide-react";

interface Option {
  id: string;
  name: string;
}

interface SourceRow {
  key: number;
  sourceName: string;
  sourceType: string;
  contactName: string;
  contactNickname: string;
  contactPhone: string;
  contactWechat: string;
  contactEmail: string;
  costPrice: string;
  salePrice: string;
  currency: string;
  status: "ACTIVE" | "DISABLED";
}

function parseNames(text: string): string[] {
  return text
    .split(/[,，;；、|/\n\r]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

// Free-text name input with datalist suggestions. Names are resolved / created
// by the backend, so admins can type brand-new 出版社/领域/收录/形式/核心类型.
function NameTagsInput({
  label,
  placeholder,
  options,
  value,
  onChange,
}: {
  label: string;
  placeholder?: string;
  options: Option[];
  value: string;
  onChange: (v: string) => void;
}) {
  const inputCls =
    "w-full px-3.5 py-2 bg-slate-950/80 border border-slate-800 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-blue-500";
  const labelCls = "block text-xs text-slate-300 mb-1";
  const datalistId = `dl-${label}`;
  return (
    <div>
      <label className={labelCls}>{label}</label>
      <input
        type="text"
        list={datalistId}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={inputCls}
      />
      <datalist id={datalistId}>
        {options.map((o) => (
          <option key={o.id} value={o.name} />
        ))}
      </datalist>
      {value.trim() !== "" && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {parseNames(value).map((n) => (
            <span
              key={n}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-blue-950/60 border border-blue-800/60 text-[11px] text-blue-300"
            >
              <Tag className="w-3 h-3" />
              {n}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export default function CreateJournalPage() {
  const router = useRouter();
  const [options, setOptions] = useState<{
    publishers: Option[];
    indexingDatabases: Option[];
    formats: Option[];
    indexes: Option[];
    fields: Option[];
  }>({ publishers: [], indexingDatabases: [], formats: [], indexes: [], fields: [] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [duplicate, setDuplicate] = useState<{ existingId: string; message: string } | null>(null);

  const [title, setTitle] = useState("");
  const [publisherName, setPublisherName] = useState("");
  const [description, setDescription] = useState("");
  const [level, setLevel] = useState<"ORDINARY" | "CORE">("ORDINARY");

  const [indexingText, setIndexingText] = useState("");
  const [formatsText, setFormatsText] = useState("");
  const [coreTypesText, setCoreTypesText] = useState("");
  const [fieldsText, setFieldsText] = useState("");

  const [status, setStatus] = useState<"DRAFT" | "PENDING">("DRAFT");
  const [sources, setSources] = useState<SourceRow[]>([
    {
      key: 0,
      sourceName: "",
      sourceType: "",
      contactName: "",
      contactNickname: "",
      contactPhone: "",
      contactWechat: "",
      contactEmail: "",
      costPrice: "",
      salePrice: "",
      currency: "CNY",
      status: "ACTIVE",
    },
  ]);

  useEffect(() => {
    Promise.all([
      fetch("/api/v1/admin/publishers").then((r) => r.json()),
      fetch("/api/v1/admin/indexing-databases").then((r) => r.json()),
      fetch("/api/v1/admin/journal-formats").then((r) => r.json()),
      fetch("/api/v1/admin/journal-indexes").then((r) => r.json()),
      fetch("/api/v1/admin/fields").then((r) => r.json()),
    ]).then(([pub, idx, fmt, ix, fld]) => {
      const list = (d: unknown) => (Array.isArray(d) ? d : (d as { data?: unknown })?.data ?? []);
      setOptions({
        publishers: list(pub.data ?? pub) as Option[],
        indexingDatabases: list(idx.data ?? idx) as Option[],
        formats: list(fmt.data ?? fmt) as Option[],
        indexes: list(ix.data ?? ix) as Option[],
        fields: list(fld.data ?? fld) as Option[],
      });
    });
  }, []);

  const updateSource = (key: number, patch: Partial<SourceRow>) => {
    setSources((prev) => prev.map((s) => (s.key === key ? { ...s, ...patch } : s)));
  };

  const addSource = () => {
    setSources((prev) => [
      ...prev,
      {
        key: Date.now() + Math.random(),
        sourceName: "",
        sourceType: "",
        contactName: "",
        contactNickname: "",
        contactPhone: "",
        contactWechat: "",
        contactEmail: "",
        costPrice: "",
        salePrice: "",
        currency: "CNY",
        status: "ACTIVE",
      },
    ]);
  };

  const removeSource = (key: number) => {
    setSources((prev) => prev.filter((s) => s.key !== key));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");
    setDuplicate(null);

    const coreTypes = parseNames(coreTypesText);
    if (level === "CORE" && coreTypes.length === 0) {
      setError("核心期刊必须至少选择一个核心类型（如 EI、北大核心、CSSCI 等）");
      return;
    }

    const validSources = sources.filter((s) => s.sourceName.trim() !== "");
    if (validSources.length === 0) {
      setError("请至少填写一个资源渠道（渠道名称 + 售卖价格）");
      return;
    }
    for (const s of validSources) {
      if (s.salePrice === "" || Number.isNaN(Number(s.salePrice)) || Number(s.salePrice) < 0) {
        setError(`渠道「${s.sourceName}」的售卖价格必须是不小于 0 的合法数字`);
        return;
      }
      if (s.costPrice !== "" && (Number.isNaN(Number(s.costPrice)) || Number(s.costPrice) < 0)) {
        setError(`渠道「${s.sourceName}」的原始价格必须是不小于 0 的合法数字`);
        return;
      }
    }

    setLoading(true);
    try {
      const payload = {
        title,
        publisherName,
        description: description || undefined,
        level,
        status,
        indexing: parseNames(indexingText),
        formats: parseNames(formatsText),
        coreTypes,
        fields: parseNames(fieldsText),
        sources: validSources.map((s) => ({
          sourceName: s.sourceName,
          sourceType: s.sourceType.trim() || null,
          contactName: s.contactName.trim() || null,
          contactNickname: s.contactNickname.trim() || null,
          contactPhone: s.contactPhone.trim() || null,
          contactWechat: s.contactWechat.trim() || null,
          contactEmail: s.contactEmail.trim() || null,
          costPrice: s.costPrice !== "" ? Number(s.costPrice) : null,
          salePrice: Number(s.salePrice),
          currency: s.currency.trim().toUpperCase(),
          status: s.status,
        })),
      };

      const res = await fetch("/api/v1/admin/journals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.status === 409 && data.data?.existingId) {
        setDuplicate({ existingId: data.data.existingId, message: data.message || "该期刊已经存在" });
        throw new Error(data.message || "该期刊已经存在");
      }
      if (!res.ok) {
        throw new Error(
          data.detail && process.env.NODE_ENV !== "production"
            ? `${data.message}（${data.detail}）`
            : data.message || "创建期刊失败"
        );
      }

      setSuccessMsg("期刊创建成功！正在跳转至期刊列表...");
      setTimeout(() => {
        router.push("/admin/journals");
        router.refresh();
      }, 1200);
    } catch (err: unknown) {
      if (!(err instanceof Error)) return;
      if (!duplicate) setError(err.message);
    } finally {
      setLoading(false);
    }
  };

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
        <h1 className="text-xl font-bold text-white">新增期刊录入表单</h1>
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
            onClick={() => {
              router.push(`/admin/journals/${duplicate.existingId}/edit`);
            }}
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
                placeholder="例: IEEE软件工程汇刊"
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
                placeholder="直接输入出版社名称，可复用已有出版社"
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
                placeholder="简要介绍该期刊（可选）"
                rows={3}
                className={inputCls}
              />
            </div>
          </div>
        </div>

        {/* 2. 期刊级别 + 核心类型 */}
        <div className={section}>
          <h2 className={sectionTitle}>2. 期刊级别与核心类型</h2>
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
              <span className="font-medium text-amber-400">核心期刊 (CORE)</span>
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
              <span className="text-slate-400">普通期刊 (ORDINARY)</span>
            </label>
          </div>
          <NameTagsInput
            label={level === "CORE" ? "核心类型 *（核心期刊必填，可多个，逗号分隔）" : "核心类型（普通期刊可留空，可多个）"}
            placeholder="例: EI, 北大核心, CSSCI"
            options={options.indexes}
            value={coreTypesText}
            onChange={setCoreTypesText}
          />
          <p className="text-[11px] text-slate-500">
            普通期刊不要求核心类型；核心期刊（EI/北大核心/CSSCI/G4 等）必须选择至少一个核心类型。
          </p>
        </div>

        {/* 3. 收录网站 */}
        <div className={section}>
          <h2 className={sectionTitle}>3. 收录网站</h2>
          <NameTagsInput
            label="该期刊被收录的数据库 / 网站（可多选，逗号分隔）"
            placeholder="例: 知网, 万方, 维普, 龙源"
            options={options.indexingDatabases}
            value={indexingText}
            onChange={setIndexingText}
          />
        </div>

        {/* 4. 期刊形式 */}
        <div className={section}>
          <h2 className={sectionTitle}>4. 期刊形式</h2>
          <NameTagsInput
            label="期刊形式（可多选，逗号分隔）"
            placeholder="例: 电子刊, 国际刊, 纸质刊"
            options={options.formats}
            value={formatsText}
            onChange={setFormatsText}
          />
        </div>

        {/* 5. 所属领域 */}
        <div className={section}>
          <h2 className={sectionTitle}>5. 所属领域</h2>
          <NameTagsInput
            label="所属领域（可多选，逗号分隔）"
            placeholder="例: 计算机, 人工智能, 教育技术"
            options={options.fields}
            value={fieldsText}
            onChange={setFieldsText}
          />
        </div>

        {/* 6. 资源渠道 */}
        <div className={section}>
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-2">
              <BadgeDollarSign className="w-5 h-5" />
              6. 资源渠道与价格
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
            同一本期刊可填写多个来源渠道，各渠道拥有独立价格与联系人；原始价格（成本）仅管理员可见，对外展示最低售卖价格。
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
                    <input
                      type="text"
                      value={s.sourceName}
                      onChange={(e) => updateSource(s.key, { sourceName: e.target.value })}
                      placeholder="例: 出版社直购 / 代理A"
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>渠道类型</label>
                    <input
                      type="text"
                      value={s.sourceType}
                      onChange={(e) => updateSource(s.key, { sourceType: e.target.value })}
                      placeholder="例: 直签 / 代理"
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>渠道状态</label>
                    <select
                      value={s.status}
                      onChange={(e) => updateSource(s.key, { status: e.target.value as SourceRow["status"] })}
                      className={inputCls}
                    >
                      <option value="ACTIVE">启用</option>
                      <option value="DISABLED">停用</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>原始价格（成本）</label>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={s.costPrice}
                      onChange={(e) => updateSource(s.key, { costPrice: e.target.value })}
                      placeholder="内部成本（仅管理员可见）"
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>售卖价格 *</label>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={s.salePrice}
                      onChange={(e) => updateSource(s.key, { salePrice: e.target.value })}
                      placeholder="例: 12800"
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>货币代码 *</label>
                    <input
                      type="text"
                      required
                      maxLength={8}
                      value={s.currency}
                      onChange={(e) => updateSource(s.key, { currency: e.target.value })}
                      placeholder="JPY / USD / CNY"
                      className={`${inputCls} font-mono uppercase`}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>联系人</label>
                    <input
                      type="text"
                      value={s.contactName}
                      onChange={(e) => updateSource(s.key, { contactName: e.target.value })}
                      placeholder="对接人姓名（可选）"
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>联系人昵称</label>
                    <input
                      type="text"
                      value={s.contactNickname}
                      onChange={(e) => updateSource(s.key, { contactNickname: e.target.value })}
                      placeholder="内部称呼（可选）"
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>联系方式</label>
                    <input
                      type="text"
                      value={s.contactPhone}
                      onChange={(e) => updateSource(s.key, { contactPhone: e.target.value })}
                      placeholder="手机 / 电话（可选）"
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>微信号</label>
                    <input
                      type="text"
                      value={s.contactWechat}
                      onChange={(e) => updateSource(s.key, { contactWechat: e.target.value })}
                      placeholder="微信号（可选）"
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>电子邮箱</label>
                    <input
                      type="email"
                      value={s.contactEmail}
                      onChange={(e) => updateSource(s.key, { contactEmail: e.target.value })}
                      placeholder="邮箱（可选）"
                      className={inputCls}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 状态与提交 */}
        <div className="flex items-center justify-between bg-slate-900/60 border border-slate-800 rounded-2xl p-6">
          <div>
            <label className="block text-xs text-slate-400 mb-1">保存状态选择</label>
            <div className="flex items-center gap-4 text-xs">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="status"
                  value="DRAFT"
                  checked={status === "DRAFT"}
                  onChange={() => setStatus("DRAFT")}
                  className="text-blue-600"
                />
                <span className="text-slate-300">存为草稿 (Draft)</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="status"
                  value="PENDING"
                  checked={status === "PENDING"}
                  onChange={() => setStatus("PENDING")}
                  className="text-amber-500"
                />
                <span className="text-amber-400 font-medium">提交审核 (Pending Audit)</span>
              </label>
            </div>
          </div>

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
