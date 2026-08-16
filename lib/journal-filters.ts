import type { Prisma, JournalLevel } from "@prisma/client";

export interface JournalFilterParams {
  keyword?: string;
  publisher?: string;
  indexing?: string;
  format?: string;
  level?: string;
  index?: string;
  field?: string;
  priceMin?: number;
  priceMax?: number;
  page: number;
  limit: number;
  sort: "latest" | "price-asc" | "price-desc";
}

function splitSlugs(value?: string): string[] {
  return (
    value
      ?.split(",")
      .map((s) => s.trim())
      .filter(Boolean) ?? []
  );
}

function toInt(value: string | null, fallback: number): number {
  if (value === null) return fallback;
  const n = Number.parseInt(value, 10);
  if (Number.isNaN(n)) return fallback;
  return n;
}

export function parseJournalFilters(searchParams: URLSearchParams): JournalFilterParams {
  const sortRaw = searchParams.get("sort") ?? "latest";
  const sort: JournalFilterParams["sort"] =
    sortRaw === "price-asc" || sortRaw === "price-desc" ? sortRaw : "latest";

  const priceMinRaw = searchParams.get("priceMin");
  const priceMaxRaw = searchParams.get("priceMax");
  const priceMin = priceMinRaw !== null && priceMinRaw !== "" ? Number(priceMinRaw) : undefined;
  const priceMax = priceMaxRaw !== null && priceMaxRaw !== "" ? Number(priceMaxRaw) : undefined;

  return {
    keyword: searchParams.get("keyword") ?? undefined,
    publisher: searchParams.get("publisher") ?? undefined,
    indexing: searchParams.get("indexing") ?? undefined,
    format: searchParams.get("format") ?? undefined,
    level: searchParams.get("level") ?? undefined,
    index: searchParams.get("index") ?? undefined,
    field: searchParams.get("field") ?? undefined,
    priceMin: Number.isNaN(priceMin) ? undefined : priceMin,
    priceMax: Number.isNaN(priceMax) ? undefined : priceMax,
    page: Math.max(1, toInt(searchParams.get("page"), 1)),
    limit: Math.min(50, Math.max(1, toInt(searchParams.get("limit"), 12))),
    sort,
  };
}

export function buildJournalFilterWhere(f: JournalFilterParams): Prisma.JournalWhereInput {
  const where: Prisma.JournalWhereInput = {};

  const keyword = f.keyword?.trim();
  if (keyword) {
    where.OR = [
      { title: { contains: keyword } },
      { publisher: { name: { contains: keyword } } },
    ];
  }

  const publisher = f.publisher?.trim();
  if (publisher) {
    where.publisher = { slug: publisher };
  }

  const indexing = splitSlugs(f.indexing);
  if (indexing.length > 0) {
    where.indexingDatabases = { some: { database: { slug: { in: indexing } } } };
  }

  const formats = splitSlugs(f.format);
  if (formats.length > 0) {
    where.formats = { some: { format: { slug: { in: formats } } } };
  }

  const levels = splitSlugs(f.level)
    .map((l) => l.toUpperCase())
    .filter((l): l is JournalLevel => l === "CORE" || l === "ORDINARY");
  if (levels.length > 0) {
    where.level = { in: levels };
  }

  const indexes = splitSlugs(f.index);
  if (indexes.length > 0) {
    where.indexes = { some: { index: { slug: { in: indexes } } } };
  }

  const fields = splitSlugs(f.field);
  if (fields.length > 0) {
    where.fields = { some: { field: { slug: { in: fields } } } };
  }

  if (f.priceMin != null && f.priceMax != null) {
    where.minSalePrice = { gte: f.priceMin, lte: f.priceMax };
  } else if (f.priceMin != null) {
    where.minSalePrice = { gte: f.priceMin };
  } else if (f.priceMax != null) {
    where.minSalePrice = { lte: f.priceMax };
  }

  return where;
}

export function buildJournalOrderBy(f: JournalFilterParams): Prisma.JournalOrderByWithRelationInput {
  if (f.sort === "price-asc") {
    return { minSalePrice: "asc" };
  }
  if (f.sort === "price-desc") {
    return { minSalePrice: "desc" };
  }
  return { createdAt: "desc" };
}
