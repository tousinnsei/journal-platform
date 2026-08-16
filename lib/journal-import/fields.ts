// Canonical import field definitions + Chinese/English header synonym tables.

export type ImportTarget =
  | "title"
  | "publisher"
  | "officialWebsite"
  | "note"
  | "description"
  | "indexing"
  | "format"
  | "level"
  | "coreType"
  | "field"
  | "sourceName"
  | "sourceType"
  | "contactName"
  | "contactNickname"
  | "contactPhone"
  | "contactWechat"
  | "contactEmail"
  | "costPrice"
  | "salePrice"
  | "currency"
  | "sourceNote"
  | "ignore";

export const TARGET_LABELS: Record<ImportTarget, string> = {
  title: "期刊名称",
  publisher: "出版社",
  officialWebsite: "官方网站",
  note: "备注",
  description: "期刊简介",
  indexing: "收录网站",
  format: "期刊形式",
  level: "期刊级别",
  coreType: "核心类型",
  field: "所属领域",
  sourceName: "来源渠道",
  sourceType: "渠道类型",
  contactName: "联系人姓名",
  contactNickname: "联系人昵称",
  contactPhone: "联系方式",
  contactWechat: "微信号",
  contactEmail: "电子邮箱",
  costPrice: "原始价格",
  salePrice: "售卖价格",
  currency: "货币代码",
  sourceNote: "渠道备注",
  ignore: "（忽略该列）",
};

// Synonyms per canonical field. Detection is case-insensitive and ignores
// whitespace. Exact matches win; otherwise the first synonym that is a
// substring of the header wins (longest synonym first).
export const HEADER_SYNONYMS: Record<Exclude<ImportTarget, "ignore">, string[]> = {
  title: [
    "期刊名称",
    "期刊名",
    "中文名称",
    "刊名",
    "杂志名称",
    "杂志名",
    "名称",
    "期刊",
    "杂志",
    "Journal Name",
    "Journal Title",
    "Journal",
    "Title",
    "Name",
  ],
  publisher: [
    "出版社",
    "出版社名称",
    "出版单位",
    "主办单位",
    "出版机构",
    "主办方",
    "Publisher",
    "Publishing House",
    "Press",
    "Publisher Name",
  ],
  officialWebsite: [
    "官方网站",
    "官方网址",
    "官网地址",
    "官网",
    "网站",
    "网址",
    "Official Website",
    "Website",
    "URL",
    "Homepage",
  ],
  note: ["备注", "备注说明", "期刊备注", "说明", "注释", "Note", "Remark", "Comment"],
  description: ["期刊简介", "期刊描述", "简介", "描述", "Description", "关于期刊"],
  indexing: [
    "收录网站",
    "收录数据库",
    "数据库收录",
    "收录情况",
    "检索收录",
    "被收录",
    "收录库",
    "收录",
    "数据库",
    "索引",
    "Index",
    "Indexed By",
    "Indexing",
  ],
  format: [
    "期刊形式",
    "刊物形式",
    "期刊类型",
    "刊物类型",
    "出版形式",
    "期刊载体",
    "形式",
    "刊物",
    "Publication Type",
    "Format",
    "Type",
  ],
  level: ["期刊级别", "刊物级别", "期刊等级", "级别", "等级", "Level", "Journal Level", "Grade"],
  coreType: [
    "核心收录类型",
    "核心/收录类型",
    "核心期刊类型",
    "核心类型",
    "收录类型",
    "核心类别",
    "核心标识",
    "数据库类型",
    "核心",
    "Index Type",
    "Core Index",
  ],
  field: [
    "所属领域",
    "学科领域",
    "研究方向",
    "学科",
    "专业",
    "领域",
    "分类",
    "Subject",
    "Discipline",
    "Field",
    "Domain",
    "Category",
  ],
  sourceName: [
    "来源渠道",
    "来源渠道名称",
    "渠道名称",
    "渠道来源",
    "资源来源",
    "采购渠道",
    "供应商",
    "渠道",
    "来源",
    "Source Channel",
    "Channel",
    "Source Name",
    "Source",
  ],
  sourceType: ["渠道类型", "来源类型", "渠道性质", "Source Type", "Channel Type"],
  contactName: [
    "联系人姓名",
    "对接人姓名",
    "负责人姓名",
    "联系人",
    "对接人",
    "负责人",
    "姓名",
    "Contact Person",
    "Contact Name",
    "Contact",
  ],
  contactNickname: ["联系人昵称", "微信昵称", "昵称", "Nickname"],
  contactPhone: [
    "联系电话",
    "手机号码",
    "联系方式",
    "手机",
    "电话",
    "手机号",
    "Contact Phone",
    "Phone",
    "Mobile",
    "Phone Number",
    "Telephone",
  ],
  contactWechat: ["微信号", "微信", "WeChat", "Wechat", "Weixin"],
  contactEmail: ["电子邮箱", "邮箱地址", "邮箱", "电子邮件", "Email", "E-mail", "Mail"],
  costPrice: [
    "渠道价格",
    "渠道成本",
    "原始价格",
    "成本价",
    "进货价",
    "采购价",
    "成本",
    "进价",
    "原价",
    "底价",
    "Cost Price",
    "Original Price",
    "Cost",
  ],
  salePrice: [
    "售卖价格",
    "销售价格",
    "售价金额",
    "对外价格",
    "卖出价",
    "成交价",
    "售价",
    "报价",
    "价格",
    "Sale Price",
    "Selling Price",
    "Price",
  ],
  currency: ["货币代码", "货币", "币种", "币别", "Currency"],
  sourceNote: ["渠道备注", "渠道说明", "对接备注", "Channel Note", "Source Note"],
};

export function normalizeHeader(input: string): string {
  return input
    .toString()
    .toLowerCase()
    .replace(/[\s_\-—–/\\:：，,。.;；]+/g, "")
    .trim();
}

// Detect the canonical target for a header. Returns "ignore" when nothing matches.
export function detectTarget(header: string): ImportTarget {
  const h = normalizeHeader(header);
  if (!h) return "ignore";

  // 1) Exact match across all synonym tables.
  for (const target of Object.keys(HEADER_SYNONYMS) as Exclude<ImportTarget, "ignore">[]) {
    for (const syn of HEADER_SYNONYMS[target]) {
      if (normalizeHeader(syn) === h) return target;
    }
  }

  // 2) Substring match, longest synonym first (avoids short/single-letter hits).
  const candidates: { target: Exclude<ImportTarget, "ignore">; norm: string }[] = [];
  for (const target of Object.keys(HEADER_SYNONYMS) as Exclude<ImportTarget, "ignore">[]) {
    for (const syn of HEADER_SYNONYMS[target]) {
      const norm = normalizeHeader(syn);
      if (norm.length >= 2) candidates.push({ target, norm });
    }
  }
  candidates.sort((a, b) => b.norm.length - a.norm.length);
  for (const { target, norm } of candidates) {
    if (h.includes(norm)) return target;
  }

  return "ignore";
}

// Fields that can hold multiple comma/slash separated values.
export const MULTI_VALUE_TARGETS: ImportTarget[] = ["indexing", "format", "coreType", "field"];

export function isMultiValueTarget(target: ImportTarget): boolean {
  return MULTI_VALUE_TARGETS.includes(target);
}
