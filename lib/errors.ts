import { Prisma } from "@prisma/client";

// Business error carrying an explicit HTTP status and optional structured
// details (code / field / detail) so the frontend can show *specific*
// messages instead of a generic one.
export class AppError extends Error {
  status: number;

  data?: unknown;

  code?: string;

  field?: string;

  detail?: string;

  constructor(
    message: string,
    status = 400,
    data?: unknown,
    options?: { code?: string; field?: string; detail?: string }
  ) {
    super(message);
    this.name = "AppError";
    this.status = status;
    this.data = data;
    this.code = options?.code;
    this.field = options?.field;
    this.detail = options?.detail;
  }
}

export interface FriendlyErrorResult {
  message: string;
  status: number;
  code?: string;
  field?: string;
  detail?: string;
}

const isDev = process.env.NODE_ENV !== "production";

// Maps a Prisma foreign-key constraint name to a human-facing field label so
// "出版社处理失败" / "所属领域处理失败" style errors can be produced instead of
// the old blanket "引用的数据不存在或无效".
function fkFieldFromConstraint(constraint?: string): { field: string; label: string } | null {
  const c = (constraint ?? "").toLowerCase();
  if (c.includes("publisher")) return { field: "publisher", label: "出版社" };
  if (c.includes("createdby") || (c.includes("created") && c.includes("user"))) {
    return { field: "createdBy", label: "创建人" };
  }
  if (c.includes("user")) return { field: "user", label: "用户" };
  if (c.includes("category")) return { field: "category", label: "所属分类" };
  if (c.includes("field")) return { field: "field", label: "所属领域" };
  if (c.includes("database")) return { field: "indexing", label: "收录网站" };
  if (c.includes("format")) return { field: "format", label: "期刊形式" };
  if (c.includes("index")) return { field: "coreType", label: "核心类型" };
  if (c.includes("source")) return { field: "source", label: "资源渠道" };
  if (c.includes("journal")) return { field: "journal", label: "期刊" };
  return null;
}

function prismaFriendly(e: Prisma.PrismaClientKnownRequestError): FriendlyErrorResult {
  switch (e.code) {
    case "P2002":
      return { message: "数据已存在，请勿重复提交", status: 409, code: "DUPLICATE" };
    case "P2003": {
      const fieldName = (e.meta as { field_name?: string } | undefined)?.field_name;
      const hit = fkFieldFromConstraint(fieldName);
      if (hit) {
        return {
          message: `${hit.label}处理失败：关联的记录不存在或无效，请检查「${hit.label}」字段`,
          status: 400,
          code: "FOREIGN_KEY_ERROR",
          field: hit.field,
          detail: isDev ? `外键约束失败：${fieldName ?? "未知外键"}` : undefined,
        };
      }
      return {
        message: "关联数据不存在或无效，请检查所选的字典项是否仍然有效",
        status: 400,
        code: "FOREIGN_KEY_ERROR",
        detail: isDev ? `外键约束失败：${fieldName ?? "未知外键"}` : undefined,
      };
    }
    case "P2025":
      return { message: "记录不存在或已被删除", status: 404, code: "NOT_FOUND" };
    default:
      return {
        message: "数据库操作失败，请稍后重试",
        status: 500,
        code: "DB_ERROR",
        detail: isDev ? e.message : undefined,
      };
  }
}

// Maps Prisma / unexpected errors to a safe, human-readable message. The real
// error is always logged server-side by the caller before using the result.
export function friendlyError(
  e: unknown,
  fallback = "数据保存失败，请稍后重试"
): FriendlyErrorResult {
  if (e instanceof AppError) {
    return {
      message: e.message,
      status: e.status,
      code: e.code ?? (e.status === 409 ? "CONFLICT" : "BUSINESS_ERROR"),
      field: e.field,
      detail: e.detail,
    };
  }
  if (e instanceof Prisma.PrismaClientKnownRequestError) {
    return prismaFriendly(e);
  }
  if (e instanceof Prisma.PrismaClientValidationError) {
    return {
      message: "数据校验失败：提交的数据结构与系统要求不符",
      status: 400,
      code: "VALIDATION_ERROR",
      detail: isDev ? e.message : undefined,
    };
  }
  if (e instanceof Error) {
    return {
      message: fallback,
      status: 500,
      code: "INTERNAL_ERROR",
      detail: isDev ? e.message : undefined,
    };
  }
  return { message: fallback, status: 500, code: "INTERNAL_ERROR" };
}
