import { db } from "@/lib/db";

export interface SourcePriceShape {
  costPrice: number | null;
  salePrice: number | null;
  currency: string;
}

// Aggregates the internal channel prices of a resource into the public-facing
// minimums. costPrice is always internal-only; only salePrice is ever shown.
export function pickMinPrices(sources: SourcePriceShape[]): {
  minCostPrice: number | null;
  minSalePrice: number | null;
  currency: string;
} {
  const active = sources.filter((s) => s.salePrice != null);
  if (active.length === 0) {
    return { minCostPrice: null, minSalePrice: null, currency: "CNY" };
  }
  const cheapest = active.reduce((a, b) =>
    (a.salePrice ?? 0) <= (b.salePrice ?? 0) ? a : b
  );
  const costs = sources
    .map((s) => s.costPrice)
    .filter((v): v is number => v != null);
  return {
    minSalePrice: cheapest.salePrice ?? null,
    minCostPrice: costs.length > 0 ? Math.min(...costs) : null,
    currency: cheapest.currency,
  };
}

export async function recomputeJournalPrices(journalId: string) {
  const sources = await db.journalSource.findMany({
    where: { journalId },
    select: { costPrice: true, salePrice: true, currency: true },
  });
  const min = pickMinPrices(sources);
  return db.journal.update({
    where: { id: journalId },
    data: {
      minCostPrice: min.minCostPrice,
      minSalePrice: min.minSalePrice,
      currency: min.currency,
    },
  });
}

export async function recomputeCopyrightPrices(copyrightId: string) {
  const sources = await db.softwareCopyrightSource.findMany({
    where: { copyrightId },
    select: { costPrice: true, salePrice: true, currency: true },
  });
  const min = pickMinPrices(sources);
  return db.softwareCopyright.update({
    where: { id: copyrightId },
    data: {
      minCostPrice: min.minCostPrice,
      minSalePrice: min.minSalePrice,
      currency: min.currency,
    },
  });
}

export async function recomputePatentPrices(patentId: string) {
  const sources = await db.patentSource.findMany({
    where: { patentId },
    select: { costPrice: true, salePrice: true, currency: true },
  });
  const min = pickMinPrices(sources);
  return db.patent.update({
    where: { id: patentId },
    data: {
      minCostPrice: min.minCostPrice,
      minSalePrice: min.minSalePrice,
      currency: min.currency,
    },
  });
}

export async function recomputeTrademarkPrices(serviceId: string) {
  const sources = await db.trademarkSource.findMany({
    where: { serviceId },
    select: { costPrice: true, salePrice: true, currency: true },
  });
  const min = pickMinPrices(sources);
  return db.trademarkService.update({
    where: { id: serviceId },
    data: {
      minCostPrice: min.minCostPrice,
      minSalePrice: min.minSalePrice,
      currency: min.currency,
    },
  });
}
