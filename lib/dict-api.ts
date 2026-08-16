import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { logAuditAction } from "@/lib/audit";
import { firstErrorMessage } from "@/lib/validators";
import { Role, Prisma } from "@prisma/client";
import type { z } from "zod";

export interface DictEntity {
  id: string;
  name: string;
  slug: string;
  sortOrder: number;
  parentId?: string | null;
}

export interface DictCreateData {
  name: string;
  slug: string;
  sortOrder: number;
  parentId?: string | null;
}

export interface DictOps {
  label: string;
  entityType: string;
  list: () => Promise<DictEntity[]>;
  get: (id: string) => Promise<DictEntity | null>;
  create: (data: DictCreateData) => Promise<DictEntity>;
  update: (id: string, data: DictCreateData) => Promise<DictEntity>;
  remove: (id: string) => Promise<unknown>;
  // Number of journals referencing this dictionary row (must be 0 to delete).
  linkedCount: (id: string) => Promise<number>;
  // Optional: number of child rows (e.g. Field.children). Must be 0 to delete.
  childCount?: (id: string) => Promise<number>;
  // Optional: whether this dictionary supports a parentId (self-parenting, e.g. fields).
  hasParent?: boolean;
}

function unauthorized() {
  return NextResponse.json({ code: 401, message: "未授权" }, { status: 401 });
}

function forbidden() {
  return NextResponse.json({ code: 403, message: "仅超级管理员可管理字典" }, { status: 403 });
}

function notFound(label: string) {
  return NextResponse.json({ code: 404, message: `${label}不存在` }, { status: 404 });
}

function parseBody(schema: z.ZodTypeAny, body: unknown) {
  return schema.safeParse(body);
}

function dictData(d: unknown, hasParent = false): DictCreateData {
  const rec = (d ?? {}) as Record<string, unknown>;
  const data: DictCreateData = {
    name: String(rec.name ?? ""),
    slug: String(rec.slug ?? ""),
    sortOrder: typeof rec.sortOrder === "number" ? rec.sortOrder : 0,
  };
  if (hasParent) {
    data.parentId = rec.parentId == null || rec.parentId === "" ? null : String(rec.parentId);
  }
  return data;
}

export function dictGet(ops: DictOps) {
  return async function GET() {
    const user = await getAuthUser();
    if (!user) return unauthorized();
    const list = await ops.list();
    return NextResponse.json({ code: 200, data: list });
  };
}

export function dictPost(schema: z.ZodTypeAny, ops: DictOps) {
  return async function POST(request: Request) {
    const user = await getAuthUser();
    if (!user) return unauthorized();
    if (user.role !== Role.SUPER_ADMIN) return forbidden();

    try {
      const body = await request.json();
      const parsed = parseBody(schema, body);
      if (!parsed.success) {
        return NextResponse.json(
          { code: 400, message: firstErrorMessage(parsed.error) },
          { status: 400 }
        );
      }
      const data = dictData(parsed.data, ops.hasParent);

      const rows = await ops.list();
      const slugTaken = rows.some((r) => r.slug === data.slug);
      if (slugTaken) {
        return NextResponse.json({ code: 400, message: "Slug 标识已存在" }, { status: 400 });
      }

      const row = await ops.create(data);
      await logAuditAction(user.id, `CREATE_${ops.entityType}`, ops.entityType, row.id, {
        name: row.name,
        slug: row.slug,
      });
      return NextResponse.json({ code: 200, message: `${ops.label}创建成功`, data: row });
    } catch (error: unknown) {
      return handleError(error, `${ops.label}创建失败`);
    }
  };
}

export function dictPut(schema: z.ZodTypeAny, ops: DictOps) {
  return async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
  ) {
    const { id } = await params;
    const user = await getAuthUser();
    if (!user) return unauthorized();
    if (user.role !== Role.SUPER_ADMIN) return forbidden();

    try {
      const existing = await ops.get(id);
      if (!existing) return notFound(ops.label);

      const body = await request.json();
      const parsed = parseBody(schema, body);
      if (!parsed.success) {
        return NextResponse.json(
          { code: 400, message: firstErrorMessage(parsed.error) },
          { status: 400 }
        );
      }
      const data = dictData(parsed.data, ops.hasParent);

      const rows = await ops.list();
      const slugTaken = rows.some((r) => r.slug === data.slug && r.id !== id);
      if (slugTaken) {
        return NextResponse.json({ code: 400, message: "Slug 标识已存在" }, { status: 400 });
      }

      // Self-parenting guard (fields)
      if (data.parentId === id) {
        return NextResponse.json({ code: 400, message: "不能选择自身作为上级" }, { status: 400 });
      }

      const row = await ops.update(id, data);
      await logAuditAction(user.id, `UPDATE_${ops.entityType}`, ops.entityType, id, {
        name: row.name,
        slug: row.slug,
      });
      return NextResponse.json({ code: 200, message: `${ops.label}更新成功`, data: row });
    } catch (error: unknown) {
      return handleError(error, `${ops.label}更新失败`);
    }
  };
}

export function dictDelete(ops: DictOps) {
  return async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
  ) {
    const { id } = await params;
    const user = await getAuthUser();
    if (!user) return unauthorized();
    if (user.role !== Role.SUPER_ADMIN) return forbidden();

    try {
      const existing = await ops.get(id);
      if (!existing) return notFound(ops.label);

      const linked = await ops.linkedCount(id);
      if (linked > 0) {
        return NextResponse.json(
          { code: 400, message: `该${ops.label}已被 ${linked} 个期刊关联，无法删除` },
          { status: 400 }
        );
      }

      if (ops.childCount) {
        const children = await ops.childCount(id);
        if (children > 0) {
          return NextResponse.json(
            { code: 400, message: `该${ops.label}存在 ${children} 个子项，无法删除` },
            { status: 400 }
          );
        }
      }

      await ops.remove(id);
      await logAuditAction(user.id, `DELETE_${ops.entityType}`, ops.entityType, id, {
        name: existing.name,
      });
      return NextResponse.json({ code: 200, message: `${ops.label}删除成功` });
    } catch (error: unknown) {
      return handleError(error, `${ops.label}删除失败`);
    }
  };
}

function handleError(error: unknown, fallback: string) {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
    return NextResponse.json({ code: 400, message: "名称或 Slug 标识已存在" }, { status: 400 });
  }
  console.error("Dictionary API error:", error);
  const message = error instanceof Error ? error.message : fallback;
  return NextResponse.json({ code: 500, message }, { status: 500 });
}
