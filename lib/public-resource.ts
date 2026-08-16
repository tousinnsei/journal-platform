import type { Prisma } from "@prisma/client";

// The public include deliberately never selects the `sources` relation, so
// channel cost prices and contacts can never leak to the public site.

export const publicCopyrightInclude = {
  createdBy: { select: { id: true, name: true } },
} satisfies Prisma.SoftwareCopyrightInclude;

export const publicPatentInclude = {
  createdBy: { select: { id: true, name: true } },
} satisfies Prisma.PatentInclude;

export const publicTrademarkInclude = {
  createdBy: { select: { id: true, name: true } },
} satisfies Prisma.TrademarkServiceInclude;

export interface PublicCopyright {
  id: string;
  name: string;
  shortName: string | null;
  registrationNo: string | null;
  copyrightOwner: string | null;
  description: string | null;
  note: string | null;
  type: string;
  minSalePrice: number | null;
  currency: string;
  createdByName: string | null;
}

export interface PublicPatent {
  id: string;
  name: string;
  description: string | null;
  note: string | null;
  type: string;
  minSalePrice: number | null;
  currency: string;
  createdByName: string | null;
}

export interface PublicTrademark {
  id: string;
  name: string;
  description: string | null;
  note: string | null;
  minSalePrice: number | null;
  currency: string;
  createdByName: string | null;
}

export function toPublicCopyright(
  c: Prisma.SoftwareCopyrightGetPayload<{ include: typeof publicCopyrightInclude }>
): PublicCopyright {
  return {
    id: c.id,
    name: c.name,
    shortName: c.shortName,
    registrationNo: c.registrationNo,
    copyrightOwner: c.copyrightOwner,
    description: c.description,
    note: c.note,
    type: c.type,
    minSalePrice: c.minSalePrice,
    currency: c.currency,
    createdByName: c.createdBy?.name ?? null,
  };
}

export function toPublicPatent(
  p: Prisma.PatentGetPayload<{ include: typeof publicPatentInclude }>
): PublicPatent {
  return {
    id: p.id,
    name: p.name,
    description: p.description,
    note: p.note,
    type: p.type,
    minSalePrice: p.minSalePrice,
    currency: p.currency,
    createdByName: p.createdBy?.name ?? null,
  };
}

export function toPublicTrademark(
  t: Prisma.TrademarkServiceGetPayload<{ include: typeof publicTrademarkInclude }>
): PublicTrademark {
  return {
    id: t.id,
    name: t.name,
    description: t.description,
    note: t.note,
    minSalePrice: t.minSalePrice,
    currency: t.currency,
    createdByName: t.createdBy?.name ?? null,
  };
}
