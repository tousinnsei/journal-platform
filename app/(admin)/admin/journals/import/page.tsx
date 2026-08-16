"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Upload,
  RefreshCw,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  XCircle,
  Info,
  ClipboardCheck,
} from "lucide-react";
import {
  TARGET_LABELS,
  type ImportTarget,
  type ImportGroup,
  type ImportPreview,
  type ImportDecision,
  type ImportResult,
} from "@/lib/journal-import";

const section = "bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-4";
const sectionTitle = "text-sm font-bold text-blue-400 uppercase tracking-wider";

const TARGET_OPTIONS = (Object.keys(TARGET_LABELS) as ImportTarget[]).map((t) => ({
  value: t,
  label: TARGET_LABELS[t],
}));

const STATUS_OPTIONS: { value: "DRAFT" | "PENDING" | "PUBLISHED"; label: string }[] = [
  { value: "DRAFT", label: "草稿" },
  { value: "PENDING", label: "待审核" },
  { value: "PUBLISHED", label: "已发布" },
];

type DecisionAction = "CREATE" | "MERGE" | "SKIP";

const DECISION_OPTIONS: { value: DecisionAction; label: string }[] = [
  { value: "MERGE", label: "合并到现有期刊" },
  { value: "CREATE", label: "新建期刊" },
  { value: "SKIP", label: "跳过" },
];

interface TableRow {
  rowIndex: number;
  group: ImportGroup;
  sourceName: string;
  costPrice: number | null;
  salePrice: number | null;
  status: string;
  statusCls: string;
  statusLabel: string;
  errors: string[];
}

function statusMeta(status: string): { cls: string; label: string } {
  if (status === "OK") return { cls: "text-emerald-400 bg-emerald-950/60 border-emerald-800/60", label: "可导入" };
  if (status === "DUPLICATE") return { cls: "text-amber-400 bg-amber-950/60 border-amber-800/60", label: "疑似重复" };
  return { cls: "text-red-400 bg-red-950/60 border-red-800/60", label: "数据错误" };
}

export default function JournalImportPage() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [parsing, setParsing] = useState(false);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [mapping, setMapping] = useState<Record<string, Record<string, ImportTarget>>>({});
  const [decisions, setDecisions] = useState<Record<string, DecisionAction>>({});
  const [status, setStatus] = useState<"DRAFT" | "PENDING" | "PUBLISHED">("PENDING");
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 100;

  const runPreview = async (mappingOverride?: Record<string, Record<string, ImportTarget>> | null) => {
    if (!file) {
      setError("请先选择文件");
      return;
    }
    setParsing(true);
    setError("");
    setResult(null);
    try {
      const form = new FormData();
      form.append("file", file);
      if (mappingOverride) form.append("mapping", JSON.stringify(mappingOverride));
      const res = await fetch("/api/v1/admin/journals/import/preview", { method: "POST", body: form });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "预览解析失败");
      const data = json.data as ImportPreview;
      setPreview(data);
      const nextDecisions: Record<string, DecisionAction> = {};
      for (const g of data.groups) {
        if (g.status === "DUPLICATE") nextDecisions[g.key] = g.duplicateKind === "exact" ? "MERGE" : "CREATE";
        else if (g.status === "OK") nextDecisions[g.key] = "CREATE";
        else nextDecisions[g.key] = "SKIP";
      }
      setDecisions(nextDecisions);
      setPage(1);
    } catch (e) {
      setError(e instanceof Error ? e.message : "预览解析失败");
    } finally {
      setParsing(false);
    }
  };

  const handleFileChange = (f: File | null) => {
    setFile(f);
    setPreview(null);
    setResult(null);
    setError("");
    setMapping({});
    setDecisions({});
  };

  const setMappingValue = (sheet: string, column: string, target: ImportTarget) => {
    setMapping((prev) => {
      const next = { ...prev, [sheet]: { ...(prev[sheet] ?? {}) } };
      next[sheet][column] = target;
      return next;
    });
  };

  const setDecision = (key: string, action: DecisionAction) => {
    setDecisions((prev) => ({ ...prev, [key]: action }));
  };

  const doImport = async () => {
    if (!file || !preview) return;
    setImporting(true);
    setError("");
    try {
      const decisionList: ImportDecision[] = Object.entries(decisions).map(([key, action]) => {
        const group = preview.groups.find((g) => g.key === key);
        return {
          key,
          action,
          ...(action === "MERGE" && group?.existingJournalId ? { existingJournalId: group.existingJournalId } : {}),
        };
      });
      const form = new FormData();
      form.append("file", file);
      form.append("mapping", JSON.stringify(mapping));
      form.append("decisions", JSON.stringify(decisionList));
      form.append("status", status);
      const res = await fetch("/api/v1/admin/journals/import/confirm", { method: "POST", body: form });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "导入失败");
      setResult(json.data as ImportResult);
    } catch (e) {
      setError(e instanceof Error ? e.message : "导入失败");
    } finally {
      setImporting(false);
    }
  };

  const tableRows: TableRow[] = useMemo(() => {
    if (!preview) return [];
    const rows: TableRow[] = [];
    for (const group of preview.groups) {
      for (const r of group.rows) {
        const meta = statusMeta(r.status);
        rows.push({
          rowIndex: r.rowIndex,
          group,
          sourceName: r.sourceName,
          costPrice: r.costPrice,
          salePrice: r.salePrice,
          status: r.status,
          statusCls: meta.cls,
          statusLabel: meta.label,
          errors: r.errors,
        });
      }
    }
    return rows;
  }, [preview]);

  const pagedRows = tableRows.slice((page - 1) * pageSize, page * pageSize);
  const totalPages = Math.max(1, Math.ceil(tableRows.length / pageSize));

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <Link
          href="/admin/journals"
          className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>返回期刊列表</span>
        </Link>
        <h1 className="text-xl font-bold text-white">期刊数据批量导入</h1>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-950/50 border border-red-800/60 text-red-300 text-sm flex items-center gap-3">
          <XCircle className="w-5 h-5 text-red-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* 1. 文件上传 */}
      <div className={section}>
        <h2 className={sectionTitle}>1. 上传数据文件</h2>
        <p className="text-xs text-slate-400 leading-relaxed">
          支持 .xlsx / .xls / .csv，大小不超过 20MB。系统会自动识别列含义（期刊名称、出版社、收录、形式、级别、领域、渠道、原价、售价等），
          识别不准确时可在第 2 步手动调整列映射。
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={(e) => handleFileChange(e.target.files?.[0] ?? null)}
            className="block w-full max-w-md text-xs text-slate-300 file:mr-3 file:px-3 file:py-2 file:rounded-lg file:border-0 file:bg-blue-600 file:text-white file:text-xs file:font-medium file:cursor-pointer hover:file:bg-blue-500"
          />
          <button
            type="button"
            onClick={() => runPreview(mapping)}
            disabled={!file || parsing}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
          >
            {parsing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            {parsing ? "解析中..." : "解析预览"}
          </button>
        </div>
        {file && (
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <FileSpreadsheet className="w-4 h-4 text-blue-400" />
            <span>{file.name}</span>
            <span className="text-slate-600">（{Math.round(file.size / 1024)} KB）</span>
          </div>
        )}
      </div>

      {preview && (
        <>
          {/* 2. 汇总统计 */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5">
              <div className="text-xs text-slate-400 mb-1">总数据行</div>
              <div className="text-2xl font-bold text-white">{preview.totalRows}</div>
            </div>
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5">
              <div className="text-xs text-slate-400 mb-1">可导入</div>
              <div className="text-2xl font-bold text-emerald-400">{preview.okRows}</div>
              <div className="text-[11px] text-slate-500">新期刊 {preview.newGroups} 组</div>
            </div>
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5">
              <div className="text-xs text-slate-400 mb-1">疑似重复</div>
              <div className="text-2xl font-bold text-amber-400">{preview.duplicateRows}</div>
              <div className="text-[11px] text-slate-500">重复期刊 {preview.duplicateGroups} 组</div>
            </div>
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5">
              <div className="text-xs text-slate-400 mb-1">数据错误</div>
              <div className="text-2xl font-bold text-red-400">{preview.errorRows}</div>
              <div className="text-[11px] text-slate-500">错误期刊 {preview.errorGroups} 组</div>
            </div>
          </div>

          {/* 疑似相同出版社 */}
          {preview.publisherSuggestions?.length > 0 && (
            <div className="bg-amber-950/30 border border-amber-800/50 rounded-2xl p-5 space-y-2">
              <h2 className="text-sm font-bold text-amber-400 uppercase tracking-wider">
                疑似相同出版社
              </h2>
              <p className="text-xs text-amber-200/70">
                以下出版社与库中已有出版社拼写相近。系统不会自动合并，请确认后决定是否手动修改数据。
              </p>
              <ul className="space-y-1.5 text-xs text-amber-100/90">
                {preview.publisherSuggestions.map((s) => (
                  <li key={s.name} className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>
                      文件中的「{s.name}」与已有「{s.suggested}」可能为同一出版社（涉及 {s.count} 组期刊）
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* 3. 列映射调整 */}
          <div className={section}>
            <h2 className={sectionTitle}>2. 列映射确认</h2>
            <p className="text-xs text-slate-400">
              调整映射后请点击「重新解析」以刷新预览结果。
            </p>
            <div className="space-y-6">
              {preview.sheets.map((sheet) => (
                <div key={sheet.name} className="space-y-2">
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-200">
                    <FileSpreadsheet className="w-4 h-4 text-blue-400" />
                    工作表：{sheet.name}
                    <span className="text-slate-500 font-normal">（{sheet.rowCount} 行数据）</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                    {sheet.columns.map((col) => {
                      const value = mapping[sheet.name]?.[col.column] ?? col.target;
                      return (
                        <label key={col.column} className="flex items-center gap-2 text-xs">
                          <span className="w-28 shrink-0 truncate text-slate-400" title={col.column}>
                            {col.column}
                          </span>
                          <select
                            value={value}
                            onChange={(e) => setMappingValue(sheet.name, col.column, e.target.value as ImportTarget)}
                            className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                          >
                            {TARGET_OPTIONS.map((opt) => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                        </label>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() => runPreview(mapping)}
              disabled={parsing}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-white text-xs font-medium disabled:opacity-50 transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${parsing ? "animate-spin" : ""}`} />
              重新解析
            </button>
          </div>

          {/* 4. 重复期刊处理决策 */}
          {preview.duplicateGroups > 0 && (
            <div className={section}>
              <h2 className={sectionTitle}>3. 疑似重复期刊处理</h2>
              <p className="text-xs text-slate-400">
                系统按「期刊名称 + 出版社」识别重复；名称相同但出版社不同会被标记为“近似重复”，新建不会破坏现有期刊。
              </p>
              <div className="space-y-2">
                {preview.groups
                  .filter((g) => g.status === "DUPLICATE")
                  .map((g) => (
                    <div
                      key={g.key}
                      className="flex flex-wrap items-center gap-3 rounded-xl bg-slate-800/40 border border-slate-700/60 px-4 py-3 text-sm"
                    >
                      <div className="flex-1 min-w-[200px]">
                        <div className="text-slate-200 font-medium">{g.title}</div>
                        <div className="text-[11px] text-slate-500">
                          {g.publisher} · {g.sources.length} 条渠道
                        </div>
                      </div>
                      <div className="text-[11px] text-amber-400 bg-amber-950/60 border border-amber-800/60 rounded-full px-2.5 py-1">
                        {g.duplicateKind === "exact" ? "完全重复" : "近似重复"}：{g.existingTitle}
                      </div>
                      <select
                        value={decisions[g.key] ?? (g.duplicateKind === "exact" ? "MERGE" : "CREATE")}
                        onChange={(e) => setDecision(g.key, e.target.value as DecisionAction)}
                        className="bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                      >
                        {DECISION_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* 5. 数据预览表 */}
          <div className={section}>
            <h2 className={sectionTitle}>
              {preview.duplicateGroups > 0 ? "4. 数据预览（按行）" : "3. 数据预览（按行）"}
            </h2>
            <div className="overflow-x-auto rounded-xl border border-slate-800">
              <table className="w-full text-xs">
                <thead className="bg-slate-800/60 text-slate-400">
                  <tr>
                    <th className="px-3 py-2 text-left">#</th>
                    <th className="px-3 py-2 text-left">期刊名称</th>
                    <th className="px-3 py-2 text-left">出版社</th>
                    <th className="px-3 py-2 text-left">收录</th>
                    <th className="px-3 py-2 text-left">形式</th>
                    <th className="px-3 py-2 text-left">级别</th>
                    <th className="px-3 py-2 text-left">领域</th>
                    <th className="px-3 py-2 text-left">渠道</th>
                    <th className="px-3 py-2 text-right">原价</th>
                    <th className="px-3 py-2 text-right">售价</th>
                    <th className="px-3 py-2 text-left">状态</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {pagedRows.map((row) => (
                    <tr key={row.rowIndex} className="text-slate-300 hover:bg-slate-800/30">
                      <td className="px-3 py-2 text-slate-500">{row.rowIndex}</td>
                      <td className="px-3 py-2 text-slate-100 max-w-[180px] truncate" title={row.group.title}>
                        {row.group.title}
                      </td>
                      <td className="px-3 py-2 max-w-[120px] truncate" title={row.group.publisher}>
                        {row.group.publisher}
                      </td>
                      <td className="px-3 py-2 max-w-[140px] truncate" title={row.group.indexing.join("、")}>
                        {row.group.indexing.join("、")}
                      </td>
                      <td className="px-3 py-2 max-w-[120px] truncate" title={row.group.formats.join("、")}>
                        {row.group.formats.join("、")}
                      </td>
                      <td className="px-3 py-2">
                        {row.group.level === "CORE" ? (
                          <span className="text-blue-400 font-medium">核心</span>
                        ) : (
                          "普通"
                        )}
                      </td>
                      <td className="px-3 py-2 max-w-[140px] truncate" title={row.group.fields.join("、")}>
                        {row.group.fields.join("、")}
                      </td>
                      <td className="px-3 py-2 max-w-[120px] truncate" title={row.sourceName}>
                        {row.sourceName || "—"}
                      </td>
                      <td className="px-3 py-2 text-right text-slate-500">{row.costPrice ?? ""}</td>
                      <td className="px-3 py-2 text-right text-emerald-400 font-medium">{row.salePrice ?? ""}</td>
                      <td className="px-3 py-2">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[11px] ${row.statusCls}`}
                          title={row.errors.join("；")}
                        >
                          {row.status === "OK" && <CheckCircle2 className="w-3 h-3" />}
                          {row.status === "DUPLICATE" && <AlertTriangle className="w-3 h-3" />}
                          {row.status === "ERROR" && <AlertCircle className="w-3 h-3" />}
                          {row.statusLabel}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>
                共 {tableRows.length} 行 · 第 {page}/{totalPages} 页
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-xs transition-colors cursor-pointer"
                >
                  上一页
                </button>
                <button
                  type="button"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-xs transition-colors cursor-pointer"
                >
                  下一页
                </button>
              </div>
            </div>
          </div>

          {/* 6. 导入确认 */}
          <div className={section}>
            <h2 className={sectionTitle}>
              {preview.duplicateGroups > 0 ? "5. 确认导入" : "4. 确认导入"}
            </h2>

            {preview.newDictValues.publishers.length + preview.newDictValues.indexing.length + preview.newDictValues.formats.length + preview.newDictValues.coreTypes.length + preview.newDictValues.fields.length > 0 && (
              <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/60 text-xs text-slate-300 flex gap-3">
                <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <div>导入后将自动创建以下字典项（便于后续维护）：</div>
                  <div className="text-slate-400">
                    出版社：{preview.newDictValues.publishers.join("、") || "—"}
                  </div>
                  <div className="text-slate-400">
                    收录库：{preview.newDictValues.indexing.join("、") || "—"}
                  </div>
                  <div className="text-slate-400">
                    期刊形式：{preview.newDictValues.formats.join("、") || "—"}
                  </div>
                  <div className="text-slate-400">
                    核心类型：{preview.newDictValues.coreTypes.join("、") || "—"}
                  </div>
                  <div className="text-slate-400">
                    学科领域：{preview.newDictValues.fields.join("、") || "—"}
                  </div>
                </div>
              </div>
            )}

            <div className="flex flex-wrap items-end gap-4">
              <div>
                <label className="block text-xs text-slate-300 mb-1">导入后状态</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as typeof status)}
                  className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                >
                  {STATUS_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="button"
                onClick={doImport}
                disabled={importing}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold disabled:opacity-50 transition-colors cursor-pointer"
              >
                <ClipboardCheck className="w-4 h-4" />
                {importing ? "导入中..." : "确认导入"}
              </button>
            </div>
          </div>
        </>
      )}

      {result && (
        <div className={section}>
          <h2 className={sectionTitle}>导入结果</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="rounded-xl bg-slate-800/40 border border-slate-700/60 p-4">
              <div className="text-xs text-slate-400 mb-1">新增期刊</div>
              <div className="text-2xl font-bold text-emerald-400">{result.newJournalCount}</div>
            </div>
            <div className="rounded-xl bg-slate-800/40 border border-slate-700/60 p-4">
              <div className="text-xs text-slate-400 mb-1">合并重复</div>
              <div className="text-2xl font-bold text-amber-400">{result.mergedCount}</div>
            </div>
            <div className="rounded-xl bg-slate-800/40 border border-slate-700/60 p-4">
              <div className="text-xs text-slate-400 mb-1">新增渠道</div>
              <div className="text-2xl font-bold text-blue-400">{result.newSourceCount}</div>
            </div>
            <div className="rounded-xl bg-slate-800/40 border border-slate-700/60 p-4">
              <div className="text-xs text-slate-400 mb-1">数据错误</div>
              <div className="text-2xl font-bold text-red-400">{result.errorRows}</div>
            </div>
          </div>
          <div className="text-xs text-slate-400">
            成功处理 {result.successRows} 行，跳过 {result.skippedRows} 行（疑似重复未合并），共 {result.totalRows} 行。导入日志 ID：{result.importLogId}
          </div>
          {result.rowErrors.length > 0 && (
            <div className="rounded-xl border border-red-800/60 bg-red-950/30 p-4 space-y-2">
              <div className="text-xs font-semibold text-red-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                以下 {result.rowErrors.length} 行存在数据错误，未导入（请修正后重新导入）：
              </div>
              <div className="max-h-60 overflow-y-auto space-y-1 text-[11px] text-red-200/80">
                {result.rowErrors.map((e) => (
                  <div key={e.rowIndex} className="flex gap-2">
                    <span className="shrink-0 text-red-400">#{e.rowIndex}</span>
                    <span className="shrink-0 text-slate-400">{e.title}</span>
                    <span>{e.errors.join("；")}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
