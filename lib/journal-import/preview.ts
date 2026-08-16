import { db } from "@/lib/db";
import { isMultiValueTarget, type ImportTarget } from "./fields";
import { parseFileBuffer, type ColumnMapping, type RawSheet } from "./parse";

// ---------- Value normalization helpers ----------

export function cleanValue(value: string): string {
  return value.replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
}

export function splitMulti(value: string): string[] {
  if (!value) return [];
  return value
    .split(/[,，;；、/||\n\r]+/)
    .map((s) => cleanValue(s))
    .filter(Boolean);
}

export function normalizeTitle(value: string): string {
  return value
    .toLowerCase()
    .replace(/[\s\u3000]+/g, "")
    .replace(
      /[，。、；：（）()【】\[\]《》〈〉「」『』“”‘’""''·.,:;!！?？\-—_—/\\|~`#$%^&*+={}<>]/g,
      ""
    )
    .trim();
}

function parseLevel(value: string): { level: "ORDINARY" | "CORE"; error?: string } {
  const v = cleanValue(value);
  if (!v) return { level: "ORDINARY" };
  const lower = v.toLowerCase();
  if (lower.includes("核心") || lower === "core") return { level: "CORE" };
  if (lower.includes("普通") || lower.includes("一般") || lower.includes("省级") || lower === "ordinary") {
    return { level: "ORDINARY" };
  }
  return { level: "ORDINARY", error: `无法识别的期刊级别「${value}」，仅支持 核心/普通（CORE/ORDINARY）` };
}

function parsePrice(value: string): { price: number | null; error?: string } {
  const v = cleanValue(value);
  if (!v) return { price: null };
  const cleaned = v
    .replace(/[¥￥$€£元]/g, "")
    .replace(/[,，]/g, "")
    .replace(/[^\d.+-]/g, "");
  if (cleaned === "" || cleaned === "-" || cleaned === "+" || cleaned === ".") {
    return { price: null, error: `价格「${value}」不是合法数字` };
  }
  const num = Number(cleaned);
  if (Number.isNaN(num) || !Number.isFinite(num)) {
    return { price: null, error: `价格「${value}」不是合法数字` };
  }
  if (num < 0) {
    return { price: null, error: `价格「${value}」不能为负数` };
  }
  return { price: Math.round(num) };
}

function parseCurrency(value: string): { currency: string; error?: string } {
  const v = cleanValue(value).toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (!v) return { currency: "CNY" };
  if (!/^[A-Z]{3,8}$/.test(v)) {
    return { currency: "CNY", error: `货币代码「${value}」格式不正确（应为 3-8 位英文字母，如 CNY/USD/JPY）` };
  }
  return { currency: v };
}

function parseUrl(value: string): { url: string; error?: string } {
  const v = cleanValue(value);
  if (!v) return { url: "" };
  if (!/^https?:\/\/.+/.test(v)) {
    return { url: v, error: `官方网站「${value}」应以 http:// 或 https:// 开头` };
  }
  return { url: v };
}

// ---------- Publisher similarity (疑似相同出版社) ----------

const PUBLISHER_SUFFIXES = [
  "limited",
  "ltd",
  "incorporated",
  "inc",
  "corporation",
  "corp",
  "publishing",
  "publisher",
  "company",
  "co",
  "press",
  "group",
  "出版社",
  "出版",
  "有限公司",
  "公司",
  "集团",
];

// Lowercases and strips common legal suffixes so "ABC Publishing Ltd." and
// "ABC 出版" compare equal. Never merges anything automatically - the result
// is only shown to the admin as a "可能为同一出版社" warning.
export function normalizePublisherName(name: string): string {
  let out = normalizeTitle(name);
  for (const suffix of PUBLISHER_SUFFIXES) {
    out = out.replace(new RegExp(`${suffix}$`), "");
  }
  return out.trim();
}

// Returns an existing publisher name that looks like the same publisher as
// `name` but is spelled differently, or null when there is no such match.
export function suggestExistingPublisher(name: string, existingNames: string[]): string | null {
  const base = normalizePublisherName(name);
  if (!base) return null;
  for (const existing of existingNames) {
    if (existing === name) continue;
    if (normalizePublisherName(existing) === base) return existing;
  }
  return null;
}

// ---------- Mapped row values ----------

export interface RowValues {
  title: string;
  publisher: string;
  officialWebsite: string;
  note: string;
  description: string;
  level: string;
  indexing: string[];
  formats: string[];
  coreTypes: string[];
  fields: string[];
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
  sourceNote: string;
}

function emptyValues(): RowValues {
  return {
    title: "",
    publisher: "",
    officialWebsite: "",
    note: "",
    description: "",
    level: "",
    indexing: [],
    formats: [],
    coreTypes: [],
    fields: [],
    sourceName: "",
    sourceType: "",
    contactName: "",
    contactNickname: "",
    contactPhone: "",
    contactWechat: "",
    contactEmail: "",
    costPrice: "",
    salePrice: "",
    currency: "",
    sourceNote: "",
  };
}

// Override per column per sheet: { sheetName: { columnName: ImportTarget } }.
export type MappingOverride = Record<string, Record<string, ImportTarget>> | null;

export function buildTargetsByColumn(
  sheet: RawSheet,
  mappingOverride?: MappingOverride
): Record<string, ImportTarget> {
  const result: Record<string, ImportTarget> = {};
  const sheetOverride = mappingOverride?.[sheet.name];
  for (const col of sheet.headers) {
    const explicit = sheetOverride?.[col];
    result[col] =
      explicit && explicit !== "ignore"
        ? explicit
        : (sheet.columns.find((c) => c.column === col)?.target ?? "ignore");
  }
  return result;
}

export function mapRowToValues(
  row: Record<string, string>,
  targetsByColumn: Record<string, ImportTarget>
): RowValues {
  const values = emptyValues();
  const strValues = values as unknown as Record<string, string>;
  const multiKeys: Record<string, keyof RowValues> = {
    indexing: "indexing",
    format: "formats",
    coreType: "coreTypes",
    field: "fields",
  };
  for (const [col, raw] of Object.entries(row)) {
    const target = targetsByColumn[col];
    if (!target || target === "ignore") continue;
    const v = cleanValue(raw ?? "");
    if (!v) continue;
    if (isMultiValueTarget(target)) {
      const arr = values[multiKeys[target]] as string[];
      for (const item of splitMulti(v)) {
        if (!arr.includes(item)) arr.push(item);
      }
    } else {
      if (strValues[target] === "") strValues[target] = v;
    }
  }
  return values;
}

// ---------- Channel parsing / validation ----------

export interface ImportSource {
  rowIndex: number;
  sheet: string;
  sourceName: string;
  sourceType: string | null;
  contactName: string | null;
  contactNickname: string | null;
  contactPhone: string | null;
  contactWechat: string | null;
  contactEmail: string | null;
  costPrice: number | null;
  salePrice: number | null;
  currency: string;
  sourceNote: string | null;
  valid: boolean;
  errors: string[];
}

function hasChannelData(values: RowValues): boolean {
  return Boolean(
    values.sourceName ||
      values.salePrice ||
      values.costPrice ||
      values.contactName ||
      values.contactPhone ||
      values.sourceType ||
      values.sourceNote
  );
}

function parseChannel(values: RowValues): { source: ImportSource | null; errors: string[] } {
  if (!hasChannelData(values)) {
    return { source: null, errors: [] };
  }

  const errors: string[] = [];
  const sourceName = values.sourceName;
  if (!sourceName) {
    errors.push("该行包含渠道数据但缺少「来源渠道」名称");
  }
  if (sourceName && !values.salePrice) {
    errors.push(`渠道「${sourceName}」缺少「售卖价格」`);
  }

  const sale = parsePrice(values.salePrice);
  if (sale.error) errors.push(sale.error);
  const cost = parsePrice(values.costPrice);
  if (cost.error) errors.push(cost.error);
  const currency = parseCurrency(values.currency);
  if (currency.error) errors.push(currency.error);

  const source: ImportSource = {
    rowIndex: 0,
    sheet: "",
    sourceName,
    sourceType: values.sourceType || null,
    contactName: values.contactName || null,
    contactNickname: values.contactNickname || null,
    contactPhone: values.contactPhone || null,
    contactWechat: values.contactWechat || null,
    contactEmail: values.contactEmail || null,
    costPrice: cost.price ?? null,
    salePrice: sale.error ? null : sale.price ?? null,
    currency: currency.currency,
    sourceNote: values.sourceNote || null,
    valid: errors.length === 0,
    errors,
  };

  return { source, errors };
}

// ---------- Grouping / duplicates / preview ----------

export type GroupRowStatus = "OK" | "DUPLICATE" | "ERROR";

export interface GroupRow {
  rowIndex: number;
  sheet: string;
  hasChannel: boolean;
  sourceName: string;
  costPrice: number | null;
  salePrice: number | null;
  status: GroupRowStatus;
  errors: string[];
}

export interface ImportGroup {
  key: string;
  title: string;
  publisher: string;
  officialWebsite: string;
  note: string;
  description: string;
  level: "ORDINARY" | "CORE";
  indexing: string[];
  formats: string[];
  coreTypes: string[];
  fields: string[];
  status: "OK" | "DUPLICATE" | "ERROR";
  duplicateKind?: "exact" | "similar";
  existingJournalId?: string;
  existingTitle?: string;
  errors: string[];
  sources: ImportSource[];
  rows: GroupRow[];
}

export interface RowError {
  rowIndex: number;
  sheet: string;
  title: string;
  errors: string[];
}

export interface ImportPreview {
  fileName: string;
  sheets: { name: string; columns: ColumnMapping[]; rowCount: number }[];
  groups: ImportGroup[];
  totalRows: number;
  okRows: number;
  duplicateRows: number;
  errorRows: number;
  totalGroups: number;
  newGroups: number;
  duplicateGroups: number;
  errorGroups: number;
  newDictValues: {
    publishers: string[];
    indexing: string[];
    formats: string[];
    coreTypes: string[];
    fields: string[];
  };
  // Publishers in the file that look like an existing one but with a
  // different spelling ("ABC Publishing Ltd." vs "ABC出版"). No merge is done
  // automatically; the admin decides.
  publisherSuggestions: { name: string; suggested: string; count: number }[];
  rowErrors: RowError[];
}

interface DataRow {
  index: number;
  sheet: string;
  values: RowValues;
  channel: { source: ImportSource | null; errors: string[] };
}

interface ExistingJournalRef {
  id: string;
  title: string;
  normTitle: string;
  normPublisher: string;
}

async function loadExistingJournals(): Promise<ExistingJournalRef[]> {
  const journals = await db.journal.findMany({
    select: {
      id: true,
      title: true,
      publisher: { select: { name: true } },
    },
  });
  return journals.map((j) => ({
    id: j.id,
    title: j.title,
    normTitle: normalizeTitle(j.title),
    normPublisher: normalizeTitle(j.publisher.name),
  }));
}

function detectDuplicate(
  title: string,
  publisher: string,
  existing: ExistingJournalRef[]
): { kind: "exact" | "similar"; journal: ExistingJournalRef } | null {
  const gn = normalizeTitle(title);
  const pn = normalizeTitle(publisher);
  if (!gn) return null;
  const exact = existing.find((j) => j.normTitle === gn && j.normPublisher === pn);
  if (exact) return { kind: "exact", journal: exact };
  const similar = existing.find((j) => j.normTitle === gn);
  if (similar) return { kind: "similar", journal: similar };
  return null;
}

export async function buildImportPreview(
  file: ArrayBuffer | Uint8Array,
  fileName: string,
  mappingOverride?: MappingOverride
): Promise<ImportPreview> {
  const parsed = parseFileBuffer(file, fileName);

  const dataRows: DataRow[] = [];
  const sheetMeta: ImportPreview["sheets"] = [];

  for (const sheet of parsed.sheets) {
    const targetsByColumn = buildTargetsByColumn(sheet, mappingOverride);
    sheetMeta.push({
      name: sheet.name,
      columns: sheet.columns,
      rowCount: sheet.rows.length,
    });
    sheet.rows.forEach((row, i) => {
      const values = mapRowToValues(row, targetsByColumn);
      const channel = parseChannel(values);
      dataRows.push({ index: i + 2, sheet: sheet.name, values, channel });
    });
  }

  const existing = await loadExistingJournals();

  // ---- Group data rows by normalized journal identity ----
  const groupMap = new Map<string, ImportGroup>();
  const orphanRows: DataRow[] = [];

  for (const row of dataRows) {
    const v = row.values;
    if (normalizeTitle(v.title) === "") {
      orphanRows.push(row);
      continue;
    }
    const key = `${normalizeTitle(v.title)}||${normalizeTitle(v.publisher)}`;
    let group = groupMap.get(key);

    if (!group) {
      group = {
        key,
        title: v.title,
        publisher: v.publisher,
        officialWebsite: v.officialWebsite,
        note: v.note,
        description: v.description,
        level: parseLevel(v.level).level,
        indexing: [...v.indexing],
        formats: [...v.formats],
        coreTypes: [...v.coreTypes],
        fields: [...v.fields],
        status: "OK",
        errors: [],
        sources: [],
        rows: [],
      };
      groupMap.set(key, group);
    }

    if (!group.title) group.title = v.title;
    if (!group.publisher) group.publisher = v.publisher;
    if (!group.officialWebsite) group.officialWebsite = v.officialWebsite;
    if (!group.note) group.note = v.note;
    if (!group.description) group.description = v.description;
    const lv = parseLevel(v.level);
    if (group.level === "ORDINARY" && lv.level === "CORE") group.level = "CORE";

    for (const item of v.indexing) if (!group.indexing.includes(item)) group.indexing.push(item);
    for (const item of v.formats) if (!group.formats.includes(item)) group.formats.push(item);
    for (const item of v.coreTypes) if (!group.coreTypes.includes(item)) group.coreTypes.push(item);
    for (const item of v.fields) if (!group.fields.includes(item)) group.fields.push(item);
  }

  // ---- Validate groups: journal-level + channel-level ----
  const publishers = await db.publisher.findMany({ select: { name: true } });
  const existingPublisherNames = new Set(publishers.map((p) => p.name));

  const newDictValues: ImportPreview["newDictValues"] = {
    publishers: [],
    indexing: [],
    formats: [],
    coreTypes: [],
    fields: [],
  };

  for (const group of groupMap.values()) {
    const errors: string[] = [];
    if (!group.title) errors.push("期刊名称不能为空");
    if (!group.publisher) errors.push("出版社不能为空");
    if (group.officialWebsite) {
      const url = parseUrl(group.officialWebsite);
      if (url.error) errors.push(url.error);
    }

    const sources: ImportSource[] = [];
    for (const row of dataRows) {
      const key = `${normalizeTitle(row.values.title)}||${normalizeTitle(row.values.publisher)}`;
      if (key !== group.key) continue;
      if (row.channel.source) {
        const src = row.channel.source;
        src.rowIndex = row.index;
        src.sheet = row.sheet;
        if (src.valid) sources.push(src);
      }
    }
    group.sources = sources;

    const dup =
      errors.length === 0 ? detectDuplicate(group.title, group.publisher, existing) : null;

    for (const row of dataRows) {
      const key = `${normalizeTitle(row.values.title)}||${normalizeTitle(row.values.publisher)}`;
      if (key !== group.key) continue;
      const v = row.values;
      const rowErrList = errors.length > 0 ? errors : row.channel.errors;
      const status: GroupRowStatus =
        rowErrList.length > 0 ? "ERROR" : dup ? "DUPLICATE" : "OK";
      group.rows.push({
        rowIndex: row.index,
        sheet: row.sheet,
        hasChannel: Boolean(row.channel.source),
        sourceName: v.sourceName,
        costPrice: row.channel.source?.costPrice ?? null,
        salePrice: row.channel.source?.salePrice ?? null,
        status,
        errors: rowErrList,
      });
    }

    if (errors.length > 0) {
      group.errors = errors;
      group.status = "ERROR";
      continue;
    }
    if (group.rows.every((r) => r.status === "ERROR")) {
      group.errors = [...new Set(group.rows.flatMap((r) => r.errors))];
      group.status = "ERROR";
      continue;
    }
    if (dup) {
      group.status = "DUPLICATE";
      group.duplicateKind = dup.kind;
      group.existingJournalId = dup.journal.id;
      group.existingTitle = dup.journal.title;
      continue;
    }

    group.status = "OK";

    // Only importable groups contribute "to be created" dictionary values.
    if (!existingPublisherNames.has(group.publisher) && !newDictValues.publishers.includes(group.publisher)) {
      newDictValues.publishers.push(group.publisher);
    }
    const collect = (target: keyof typeof newDictValues, values: string[]) => {
      const list = newDictValues[target];
      for (const item of values) {
        if (!list.includes(item)) list.push(item);
      }
    };
    collect("indexing", group.indexing);
    collect("formats", group.formats);
    collect("coreTypes", group.coreTypes);
    collect("fields", group.fields);
  }

  // ---- Per-row status + counts + row errors ----
  const rowErrors: RowError[] = [];
  let okRows = 0;
  let duplicateRows = 0;
  let errorRows = 0;

  for (const group of groupMap.values()) {
    for (const r of group.rows) {
      if (r.status === "ERROR") {
        errorRows += 1;
        rowErrors.push({
          rowIndex: r.rowIndex,
          sheet: r.sheet,
          title: group.title || r.sourceName || "(无名称)",
          errors: r.errors,
        });
      } else if (r.status === "DUPLICATE") {
        duplicateRows += 1;
      } else {
        okRows += 1;
      }
    }
  }

  for (const row of orphanRows) {
    errorRows += 1;
    rowErrors.push({
      rowIndex: row.index,
      sheet: row.sheet,
      title: row.values.sourceName || "(无名称)",
      errors: ["期刊名称不能为空"],
    });
  }

  const groups = Array.from(groupMap.values());

  // ---- Publisher similarity warnings (importable groups only) ----
  const publisherCounts = new Map<string, number>();
  for (const group of groups) {
    if (group.status !== "ERROR") {
      publisherCounts.set(group.publisher, (publisherCounts.get(group.publisher) ?? 0) + 1);
    }
  }
  const publisherSuggestions: ImportPreview["publisherSuggestions"] = [];
  for (const [name, count] of publisherCounts) {
    const suggested = suggestExistingPublisher(name, Array.from(existingPublisherNames));
    if (suggested) {
      publisherSuggestions.push({ name, suggested, count });
    }
  }

  return {
    fileName,
    sheets: sheetMeta,
    groups,
    totalRows: dataRows.length,
    okRows,
    duplicateRows,
    errorRows,
    totalGroups: groups.length,
    newGroups: groups.filter((g) => g.status === "OK").length,
    duplicateGroups: groups.filter((g) => g.status === "DUPLICATE").length,
    errorGroups: groups.filter((g) => g.status === "ERROR").length,
    newDictValues,
    publisherSuggestions,
    rowErrors,
  };
}
