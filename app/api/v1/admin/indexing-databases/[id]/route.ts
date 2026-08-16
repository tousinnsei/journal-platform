import { db } from "@/lib/db";
import { dictPut, dictDelete } from "@/lib/dict-api";
import { indexingDatabaseSchema } from "@/lib/validators";

const ops = {
  label: "收录网站",
  entityType: "indexing_databases",
  list: () =>
    db.indexingDatabase.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }] }),
  get: (id: string) => db.indexingDatabase.findUnique({ where: { id } }),
  create: (data: { name: string; slug: string; sortOrder: number }) =>
    db.indexingDatabase.create({ data }),
  update: (id: string, data: { name: string; slug: string; sortOrder: number }) =>
    db.indexingDatabase.update({ where: { id }, data }),
  remove: (id: string) => db.indexingDatabase.delete({ where: { id } }),
  linkedCount: (id: string) => db.journalIndexing.count({ where: { databaseId: id } }),
};

export const PUT = dictPut(indexingDatabaseSchema, ops);
export const DELETE = dictDelete(ops);
