import { db } from "@/lib/db";
import { dictPut, dictDelete } from "@/lib/dict-api";
import { fieldSchema } from "@/lib/validators";

const ops = {
  label: "所属领域",
  entityType: "fields",
  list: () =>
    db.field.findMany({
      include: { parent: { select: { id: true, name: true, slug: true } } },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    }),
  get: (id: string) => db.field.findUnique({ where: { id } }),
  create: (data: { name: string; slug: string; sortOrder: number; parentId?: string | null }) =>
    db.field.create({
      data: { name: data.name, slug: data.slug, sortOrder: data.sortOrder, parentId: data.parentId ?? null },
    }),
  update: (id: string, data: { name: string; slug: string; sortOrder: number; parentId?: string | null }) =>
    db.field.update({
      where: { id },
      data: { name: data.name, slug: data.slug, sortOrder: data.sortOrder, parentId: data.parentId ?? null },
    }),
  remove: (id: string) => db.field.delete({ where: { id } }),
  linkedCount: (id: string) => db.journalField.count({ where: { fieldId: id } }),
  childCount: (id: string) => db.field.count({ where: { parentId: id } }),
};

export const PUT = dictPut(fieldSchema, ops);
export const DELETE = dictDelete(ops);
