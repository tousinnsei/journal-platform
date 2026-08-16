import type { MetadataRoute } from "next";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

const BASE = "https://journal-platform-one.vercel.app";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [journals, copyrights, patents, trademarks] = await Promise.all([
    db.journal.findMany({
      where: { status: "PUBLISHED" },
      select: { id: true, updatedAt: true },
    }),
    db.softwareCopyright.findMany({
      where: { status: "PUBLISHED" },
      select: { id: true, updatedAt: true },
    }),
    db.patent.findMany({
      where: { status: "PUBLISHED" },
      select: { id: true, updatedAt: true },
    }),
    db.trademarkService.findMany({
      where: { status: "PUBLISHED" },
      select: { id: true, updatedAt: true },
    }),
  ]);

  return [
    {
      url: `${BASE}/`,
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${BASE}/journals`,
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${BASE}/software-copyrights`,
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      url: `${BASE}/patents`,
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      url: `${BASE}/trademarks`,
      changeFrequency: "weekly",
      priority: 0.7,
    },
    ...journals.map((j) => ({
      url: `${BASE}/journals/${j.id}`,
      lastModified: j.updatedAt,
      priority: 0.8,
    })),
    ...copyrights.map((c) => ({
      url: `${BASE}/software-copyrights/${c.id}`,
      lastModified: c.updatedAt,
      priority: 0.6,
    })),
    ...patents.map((p) => ({
      url: `${BASE}/patents/${p.id}`,
      lastModified: p.updatedAt,
      priority: 0.6,
    })),
    ...trademarks.map((t) => ({
      url: `${BASE}/trademarks/${t.id}`,
      lastModified: t.updatedAt,
      priority: 0.6,
    })),
  ];
}
