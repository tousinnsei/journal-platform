import { z } from "zod";

export function firstErrorMessage(error: z.ZodError): string {
  return error.issues[0]?.message ?? "参数校验失败";
}

export const loginSchema = z.object({
  email: z.string().email("请输入有效的电子邮箱地址"),
  password: z.string().min(6, "密码至少为6位字符"),
});

export const publisherSchema = z.object({
  name: z.string().min(1, "出版社名称不能为空"),
  slug: z.string().min(1, "Slug标识不能为空").regex(/^[a-z0-9-]+$/, "Slug仅能包含小写字母、数字与连字符"),
  country: z.string().optional().nullable(),
  officialWebsite: z.string().url("请输入有效的网址").optional().or(z.literal("")),
});

export const categorySchema = z.object({
  name: z.string().min(1, "分类名称不能为空"),
  slug: z.string().min(1, "Slug标识不能为空").regex(/^[a-z0-9-]+$/, "Slug仅能包含小写字母、数字与连字符"),
  parentId: z.string().optional().nullable(),
  sortOrder: z.number().int().default(0),
});

// A journal channel (资源渠道). costPrice is the internal 渠道价格 that must
// never be exposed on the public site. `originalPrice` is accepted as an alias
// for `costPrice` so admins and imports can use the business term.
export const journalSourceSchema = z
  .object({
    id: z.string().optional(),
    sourceName: z.string().trim().min(1, "渠道名称不能为空"),
    sourceType: z.string().optional().nullable(),
    contactName: z.string().optional().nullable(),
    contactNickname: z.string().optional().nullable(),
    contactPhone: z.string().optional().nullable(),
    contactWechat: z.string().optional().nullable(),
    contactEmail: z.string().optional().nullable(),
    contactNote: z.string().optional().nullable(),
    costPrice: z.number().int().min(0, "渠道价格不能为负数").optional().nullable(),
    originalPrice: z.number().int().min(0, "原始价格不能为负数").optional().nullable(),
    salePrice: z.number().int().min(0, "售卖价格不能为负数"),
    currency: z.string().trim().min(1, "货币代码必填").max(8).default("CNY"),
    status: z.enum(["ACTIVE", "DISABLED"]).default("ACTIVE"),
    sortOrder: z.number().int().default(0),
  })
  .transform((data) => {
    if (data.costPrice == null && data.originalPrice != null) {
      return { ...data, costPrice: data.originalPrice };
    }
    return data;
  });

const nameArray = z.array(z.string().trim().min(1, "名称不能为空")).optional().default([]);

export const journalSchema = z.object({
  title: z.string().trim().min(1, "期刊名称不能为空"),
  publisherName: z.string().trim().min(1, "出版社名称不能为空"),
  description: z.string().optional().nullable(),
  note: z.string().optional().nullable(),
  officialWebsite: z
    .string()
    .trim()
    .url("请输入有效的网址（以 http:// 或 https:// 开头）")
    .optional()
    .or(z.literal(""))
    .nullable(),
  level: z.enum(["ORDINARY", "CORE"]).default("ORDINARY"),
  journalLevel: z.enum(["ORDINARY", "CORE"]).optional(),
  status: z.enum(["DRAFT", "PENDING", "PUBLISHED", "REJECTED"]).default("DRAFT"),
  // --- 名称形式（业务对象，后端负责解析/创建字典项） ---
  indexing: nameArray,
  formats: nameArray,
  coreTypes: nameArray,
  coreType: z.string().trim().optional(),
  fields: nameArray,
  categories: nameArray,
  // --- ID 形式（向后兼容旧的表单/客户端） ---
  categoryIds: z.array(z.string()).optional().default([]),
  indexingDatabaseIds: z.array(z.string()).optional().default([]),
  formatIds: z.array(z.string()).optional().default([]),
  indexIds: z.array(z.string()).optional().default([]),
  fieldIds: z.array(z.string()).optional().default([]),
  sources: z.array(journalSourceSchema).optional().default([]),
});

const slugRegex = /^[a-z0-9-]+$/;

export const dictionarySchema = (label: string) =>
  z.object({
    name: z.string().min(1, `${label}名称不能为空`),
    slug: z
      .string()
      .min(1, "Slug标识不能为空")
      .regex(slugRegex, "Slug仅能包含小写字母、数字与连字符"),
    sortOrder: z.number().int().default(0),
  });

export const indexingDatabaseSchema = dictionarySchema("收录网站");
export const journalFormatSchema = dictionarySchema("期刊形式");
export const journalIndexSchema = dictionarySchema("核心/收录类型");

export const fieldSchema = z.object({
  name: z.string().min(1, "领域名称不能为空"),
  slug: z
    .string()
    .min(1, "Slug标识不能为空")
    .regex(slugRegex, "Slug仅能包含小写字母、数字与连字符"),
  parentId: z.string().optional().nullable(),
  sortOrder: z.number().int().default(0),
});

export const journalAuditSchema = z.object({
  status: z.enum(["PUBLISHED", "REJECTED"]),
  auditReason: z.string().optional(),
});

// ---- Software copyright (软著) ----
const resourceSourceFields = {
  id: z.string().optional(),
  sourceName: z.string().trim().min(1, "渠道名称不能为空"),
  sourceType: z.string().optional().nullable(),
  contactName: z.string().optional().nullable(),
  contactPhone: z.string().optional().nullable(),
  contactWechat: z.string().optional().nullable(),
  contactEmail: z.string().optional().nullable(),
  costPrice: z.number().int().min(0, "渠道价格不能为负数").optional().nullable(),
  salePrice: z.number().int().min(0, "售卖价格不能为负数"),
  currency: z.string().trim().min(1, "货币代码必填").max(8).default("CNY"),
  status: z.enum(["ACTIVE", "DISABLED"]).default("ACTIVE"),
  sortOrder: z.number().int().default(0),
} as const;

export const softwareCopyrightSourceSchema = z.object({ ...resourceSourceFields });

export const softwareCopyrightSchema = z.object({
  name: z.string().trim().min(1, "软著名称不能为空"),
  shortName: z.string().optional().nullable(),
  registrationNo: z.string().optional().nullable(),
  copyrightOwner: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  note: z.string().optional().nullable(),
  type: z.enum(["NORMAL", "URGENT"]).default("NORMAL"),
  status: z.enum(["DRAFT", "PENDING", "PUBLISHED", "REJECTED"]).default("DRAFT"),
  sources: z.array(softwareCopyrightSourceSchema).optional().default([]),
});

// ---- Patent (专利) ----
export const patentSourceSchema = z.object({ ...resourceSourceFields });

export const patentSchema = z.object({
  name: z.string().trim().min(1, "专利名称不能为空"),
  description: z.string().optional().nullable(),
  note: z.string().optional().nullable(),
  type: z.enum(["INVENTION", "UTILITY_MODEL", "DESIGN"]).default("INVENTION"),
  status: z.enum(["DRAFT", "PENDING", "PUBLISHED", "REJECTED"]).default("DRAFT"),
  sources: z.array(patentSourceSchema).optional().default([]),
});

// ---- Trademark service (商标) ----
export const trademarkSourceSchema = z.object({
  ...resourceSourceFields,
  times: z.number().int().min(0, "对接次数不能为负数").default(1),
});

export const trademarkServiceSchema = z.object({
  name: z.string().trim().min(1, "商标服务名称不能为空"),
  description: z.string().optional().nullable(),
  note: z.string().optional().nullable(),
  status: z.enum(["DRAFT", "PENDING", "PUBLISHED", "REJECTED"]).default("DRAFT"),
  sources: z.array(trademarkSourceSchema).optional().default([]),
});
