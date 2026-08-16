import { db } from "@/lib/db";
import { dictGet, dictPost } from "@/lib/dict-api";
import { journalIndexSchema } from "@/lib/validators";

const ops = {
  label: "核心/收录类型",
  entityType: "journal_indexes",
  list: () =>
    db.journalIndex.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }] }),
  get: (id: string) => db.journalIndex.findUnique({ where: { id } }),
  create: (data: { name: string; slug: string; sortOrder: number }) =>
    db.journalIndex.create({ data }),
  update: (id: string, data: { name: string; slug: string; sortOrder: number }) =>
    db.journalIndex.update({ where: { id }, data }),
  remove: (id: string) => db.journalIndex.delete({ where: { id } }),
  linkedCount: (id: string) => db.journalIndexLink.count({ where: { indexId: id } }),
};

export const GET = dictGet(ops);
export const POST = dictPost(journalIndexSchema, ops);
