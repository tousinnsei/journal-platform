import type { Prisma } from "@prisma/client";

export interface PublicJournal {
  id: string;
  title: string;
  description: string | null;
  level: string;
  publisher: { id: string; name: string } | null;
  categories: { id: string; name: string; slug: string }[];
  indexingDatabases: { id: string; name: string; slug: string }[];
  formats: { id: string; name: string; slug: string }[];
  indexes: { id: string; name: string; slug: string }[];
  fields: { id: string; name: string; slug: string }[];
  minSalePrice: number | null;
  currency: string;
}

// The public include deliberately never selects the `sources` relation, so
// channel cost prices and contacts can never leak to the public site.
export const publicJournalInclude = {
  publisher: { select: { id: true, name: true } },
  categories: {
    include: { category: { select: { id: true, name: true, slug: true } } },
  },
  indexingDatabases: {
    include: { database: { select: { id: true, name: true, slug: true } } },
  },
  formats: {
    include: { format: { select: { id: true, name: true, slug: true } } },
  },
  indexes: {
    include: { index: { select: { id: true, name: true, slug: true } } },
  },
  fields: {
    include: { field: { select: { id: true, name: true, slug: true } } },
  },
} satisfies Prisma.JournalInclude;

export type JournalWithPublicRelations = Prisma.JournalGetPayload<{
  include: typeof publicJournalInclude;
}>;

export function toPublicJournal(j: JournalWithPublicRelations): PublicJournal {
  return {
    id: j.id,
    title: j.title,
    description: j.description,
    level: j.level,
    publisher: j.publisher ? { id: j.publisher.id, name: j.publisher.name } : null,
    categories: j.categories.map((c) => ({
      id: c.category.id,
      name: c.category.name,
      slug: c.category.slug,
    })),
    indexingDatabases: j.indexingDatabases.map((r) => ({
      id: r.database.id,
      name: r.database.name,
      slug: r.database.slug,
    })),
    formats: j.formats.map((r) => ({
      id: r.format.id,
      name: r.format.name,
      slug: r.format.slug,
    })),
    indexes: j.indexes.map((r) => ({
      id: r.index.id,
      name: r.index.name,
      slug: r.index.slug,
    })),
    fields: j.fields.map((r) => ({
      id: r.field.id,
      name: r.field.name,
      slug: r.field.slug,
    })),
    minSalePrice: j.minSalePrice,
    currency: j.currency,
  };
}
