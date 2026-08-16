import { db } from "@/lib/db";
import { dictGet, dictPost } from "@/lib/dict-api";
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

export const GET = dictGet(ops);
export const POST = dictPost(journalFormatSchema, ops);
