import { db } from "@/lib/db";

export interface JournalDictRefs {
  categoryIds?: string[];
  indexingDatabaseIds?: string[];
  formatIds?: string[];
  indexIds?: string[];
  fieldIds?: string[];
}

// Returns a human-readable error message when any referenced dictionary ID is
// invalid, or null when all references exist.
export async function validateJournalDictRefs(refs: JournalDictRefs): Promise<string | null> {
  const checks: { label: string; ids?: string[]; count: (ids: string[]) => Promise<number> }[] = [
    {
      label: "学科分类",
      ids: refs.categoryIds,
      count: (ids) => db.category.count({ where: { id: { in: ids } } }),
    },
    {
      label: "收录网站",
      ids: refs.indexingDatabaseIds,
      count: (ids) => db.indexingDatabase.count({ where: { id: { in: ids } } }),
    },
    {
      label: "期刊形式",
      ids: refs.formatIds,
      count: (ids) => db.journalFormat.count({ where: { id: { in: ids } } }),
    },
    {
      label: "核心/收录类型",
      ids: refs.indexIds,
      count: (ids) => db.journalIndex.count({ where: { id: { in: ids } } }),
    },
    {
      label: "所属领域",
      ids: refs.fieldIds,
      count: (ids) => db.field.count({ where: { id: { in: ids } } }),
    },
  ];

  for (const check of checks) {
    if (check.ids && check.ids.length > 0) {
      const found = await check.count(check.ids);
      if (found !== check.ids.length) {
        return `${check.label} 中包含无效的 ID`;
      }
    }
  }
  return null;
}
