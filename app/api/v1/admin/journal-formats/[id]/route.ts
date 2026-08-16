import { db } from "@/lib/db";
import { dictPut, dictDelete } from "@/lib/dict-api";
import { journalFormatSchema } from "@/lib/validators";

const ops = {
  label: "期刊形式",
  entityType: "journal_formats",
  list: () =>
    db.journalFormat.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }] }),
  get: (id: string) => db.journalFormat.findUnique({ where: { id } }),
  create: (data: { name: string; slug: string; sortOrder: number }) =>
    db.journalFormat.create({ data }),
  update: (id: string, data: { name: string; slug: string; sortOrder: number }) =>
    db.journalFormat.update({ where: { id }, data }),
  remove: (id: string) => db.journalFormat.delete({ where: { id } }),
  linkedCount: (id: string) => db.journalFormatLink.count({ where: { formatId: id } }),
};

export const PUT = dictPut(journalFormatSchema, ops);
export const DELETE = dictDelete(ops);
