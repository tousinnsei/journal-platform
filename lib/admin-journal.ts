import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";

export const adminJournalInclude = {
  publisher: true,
  categories: { include: { category: true } },
  indexingDatabases: { include: { database: true } },
  formats: { include: { format: true } },
  indexes: { include: { index: true } },
  fields: { include: { field: true } },
  sources: { orderBy: { sortOrder: "asc" as const } },
  createdBy: { select: { name: true, email: true } },
} satisfies Prisma.JournalInclude;

export type JournalWithAdminRelations = Prisma.JournalGetPayload<{
  include: typeof adminJournalInclude;
}>;

export function slugify(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return slug || "publisher";
}

type DbClient = Prisma.TransactionClient | typeof db;

// Journal dictionary models that are auto-created by name when absent.
// Category = 学科分类, Field = 所属领域, IndexingDatabase = 收录网站,
// JournalFormat = 期刊形式, JournalIndex = 核心/收录类型.
export type JournalDictModel =
  | "category"
  | "indexingDatabase"
  | "journalFormat"
  | "journalIndex"
  | "field";

export const JOURNAL_DICT_LABELS: Record<JournalDictModel, string> = {
  category: "所属分类",
  indexingDatabase: "收录网站",
  journalFormat: "期刊形式",
  journalIndex: "核心类型",
  field: "所属领域",
};

// Publishers are free-form text on the journal form. Reuse an existing one by
// exact name, otherwise auto-create it. `upsert` makes this safe under
// concurrency: two simultaneous requests for the same new publisher name end
// up sharing a single row. A slug collision (two different names that
// slugify identically) is retried with a numeric suffix.
export async function findOrCreatePublisher(name: string, client: DbClient = db) {
  const trimmed = name.trim();
  if (!trimmed) {
    throw new Error("出版社名称不能为空");
  }
  return findOrCreateByName(client, "publisher", trimmed);
}

interface DictRow {
  id: string;
}

// Generic name -> row upsert for publishers and journal dictionary models.
// Resolves existing rows by name; otherwise creates them (auto-dictionary).
export async function findOrCreateByName(
  client: DbClient,
  model: "publisher" | JournalDictModel,
  name: string
): Promise<DictRow> {
  const trimmed = name.trim();
  if (!trimmed) {
    throw new Error(model === "publisher" ? "出版社名称不能为空" : "名称不能为空");
  }
  const base = slugify(trimmed);
  const hasSortOrder = model !== "publisher";
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const slug = attempt === 0 ? base : `${base}-${attempt}`;
    try {
      return await (client[model] as unknown as {
        upsert: (args: {
          where: { name: string };
          update: Record<string, never>;
          create: { name: string; slug: string; sortOrder?: number };
        }) => Promise<DictRow>;
      }).upsert({
        where: { name: trimmed },
        update: {},
        create: hasSortOrder ? { name: trimmed, slug, sortOrder: 0 } : { name: trimmed, slug },
      });
    } catch (e) {
      const isUniqueViolation =
        e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002";
      if (!isUniqueViolation) throw e;
      // Lost a slug race for this attempt; try the next suffix. If another
      // request created the name meanwhile, the next upsert reuses it.
    }
  }
  throw new Error("名称冲突，请重试");
}

export interface JournalDictInput {
  categories?: string[];
  fields?: string[];
  indexing?: string[];
  formats?: string[];
  coreTypes?: string[];
  categoryIds?: string[];
  fieldIds?: string[];
  indexingDatabaseIds?: string[];
  formatIds?: string[];
  indexIds?: string[];
}

export interface JournalDictRefs {
  categoryIds: string[];
  indexingDatabaseIds: string[];
  formatIds: string[];
  indexIds: string[];
  fieldIds: string[];
}

function uniqStrings(items: string[]): string[] {
  return [...new Set(items.map((s) => s.trim()).filter(Boolean))];
}

// Merges ID-based and name-based dictionary input, resolving names inside the
// transaction (auto-creating any missing dictionary rows) and returning the
// final IDs the journal create/update should connect.
export async function resolveJournalDictRefsTx(
  tx: Prisma.TransactionClient,
  input: JournalDictInput
): Promise<JournalDictRefs> {
  const resolveNames = async (model: JournalDictModel, names: string[]): Promise<string[]> => {
    const rows = await Promise.all(names.map((n) => findOrCreateByName(tx, model, n)));
    return rows.map((r) => r.id);
  };
  const merge = (existing: string[] = [], resolved: string[] = []) =>
    uniqStrings([...existing, ...resolved]);

  const [categories, indexingDatabases, formats, indexes, fields] = await Promise.all([
    resolveNames("category", uniqStrings(input.categories ?? [])),
    resolveNames("indexingDatabase", uniqStrings(input.indexing ?? [])),
    resolveNames("journalFormat", uniqStrings(input.formats ?? [])),
    resolveNames("journalIndex", uniqStrings(input.coreTypes ?? [])),
    resolveNames("field", uniqStrings(input.fields ?? [])),
  ]);

  return {
    categoryIds: merge(input.categoryIds, categories),
    indexingDatabaseIds: merge(input.indexingDatabaseIds, indexingDatabases),
    formatIds: merge(input.formatIds, formats),
    indexIds: merge(input.indexIds, indexes),
    fieldIds: merge(input.fieldIds, fields),
  };
}
