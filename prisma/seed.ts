import {
  PrismaClient,
  Role,
  JournalStatus,
  JournalLevel,
  ResourceStatus,
  CopyrightType,
  PatentType,
} from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

function pickMinPrices(sources: { costPrice: number | null; salePrice: number | null; currency: string }[]) {
  const active = sources.filter((s) => s.salePrice != null);
  if (active.length === 0) {
    return { minCostPrice: null, minSalePrice: null, currency: "CNY" };
  }
  const cheapest = active.reduce((a, b) => (a.salePrice! <= b.salePrice! ? a : b));
  const costs = sources.map((s) => s.costPrice).filter((v): v is number => v != null);
  return {
    minSalePrice: cheapest.salePrice!,
    minCostPrice: costs.length > 0 ? Math.min(...costs) : null,
    currency: cheapest.currency,
  };
}

interface JournalSourceInput {
  sourceName: string;
  sourceType?: string | null;
  contactName?: string | null;
  costPrice?: number | null;
  salePrice: number;
  currency: string;
  sortOrder?: number;
}

async function upsertJournalSource(journalId: string, input: JournalSourceInput) {
  const existing = await prisma.journalSource.findFirst({
    where: { journalId, sourceName: input.sourceName },
  });
  const data = {
    sourceName: input.sourceName,
    sourceType: input.sourceType ?? null,
    contactName: input.contactName ?? null,
    costPrice: input.costPrice ?? null,
    salePrice: input.salePrice,
    currency: input.currency,
    sortOrder: input.sortOrder ?? 0,
  };
  if (existing) {
    return prisma.journalSource.update({ where: { id: existing.id }, data });
  }
  return prisma.journalSource.create({ data: { journalId, ...data } });
}

async function upsertCopyrightSource(copyrightId: string, input: JournalSourceInput) {
  const existing = await prisma.softwareCopyrightSource.findFirst({
    where: { copyrightId, sourceName: input.sourceName },
  });
  const data = {
    sourceName: input.sourceName,
    sourceType: input.sourceType ?? null,
    contactName: input.contactName ?? null,
    costPrice: input.costPrice ?? null,
    salePrice: input.salePrice,
    currency: input.currency,
    sortOrder: input.sortOrder ?? 0,
  };
  if (existing) {
    return prisma.softwareCopyrightSource.update({ where: { id: existing.id }, data });
  }
  return prisma.softwareCopyrightSource.create({ data: { copyrightId, ...data } });
}

async function upsertPatentSource(patentId: string, input: JournalSourceInput) {
  const existing = await prisma.patentSource.findFirst({
    where: { patentId, sourceName: input.sourceName },
  });
  const data = {
    sourceName: input.sourceName,
    sourceType: input.sourceType ?? null,
    contactName: input.contactName ?? null,
    costPrice: input.costPrice ?? null,
    salePrice: input.salePrice,
    currency: input.currency,
    sortOrder: input.sortOrder ?? 0,
  };
  if (existing) {
    return prisma.patentSource.update({ where: { id: existing.id }, data });
  }
  return prisma.patentSource.create({ data: { patentId, ...data } });
}

async function upsertTrademarkSource(serviceId: string, input: JournalSourceInput & { times?: number }) {
  const existing = await prisma.trademarkSource.findFirst({
    where: { serviceId, sourceName: input.sourceName },
  });
  const data = {
    sourceName: input.sourceName,
    sourceType: input.sourceType ?? null,
    contactName: input.contactName ?? null,
    costPrice: input.costPrice ?? null,
    salePrice: input.salePrice,
    currency: input.currency,
    sortOrder: input.sortOrder ?? 0,
    times: input.times ?? 1,
  };
  if (existing) {
    return prisma.trademarkSource.update({ where: { id: existing.id }, data });
  }
  return prisma.trademarkSource.create({ data: { serviceId, ...data } });
}

async function main() {
  console.log("Seeding database...");

  // 1. Users
  if (process.env.NODE_ENV === "production" && !process.env.ADMIN_PASSWORD) {
    throw new Error("ADMIN_PASSWORD is required when seeding in production");
  }
  const adminEmail = process.env.ADMIN_EMAIL || "admin@journal.org";
  const adminPassword = process.env.ADMIN_PASSWORD || "admin123456";
  const editorEmail = process.env.EDITOR_EMAIL || "editor@journal.org";
  const editorPassword = process.env.EDITOR_PASSWORD || "editor123456";
  const adminHash = await bcrypt.hash(adminPassword, 10);
  const editorHash = await bcrypt.hash(editorPassword, 10);

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: process.env.ADMIN_PASSWORD ? { passwordHash: adminHash } : {},
    create: {
      email: adminEmail,
      passwordHash: adminHash,
      name: "超级管理员",
      role: Role.SUPER_ADMIN,
    },
  });

  const editor = await prisma.user.upsert({
    where: { email: editorEmail },
    update: process.env.EDITOR_PASSWORD ? { passwordHash: editorHash } : {},
    create: {
      email: editorEmail,
      passwordHash: editorHash,
      name: "平台编辑",
      role: Role.EDITOR,
    },
  });

  console.log(`Ensured users: ${admin.email}, ${editor.email}`);

  // 2. Publishers
  const publishers = [
    { name: "IEEE", slug: "ieee", country: "United States", officialWebsite: "https://www.ieee.org" },
    { name: "Springer Nature", slug: "springer-nature", country: "Germany", officialWebsite: "https://www.springernature.com" },
    { name: "Elsevier", slug: "elsevier", country: "Netherlands", officialWebsite: "https://www.elsevier.com" },
    { name: "Wiley", slug: "wiley", country: "United States", officialWebsite: "https://www.wiley.com" },
    { name: "Taylor & Francis", slug: "taylor-francis", country: "United Kingdom", officialWebsite: "https://taylorandfrancis.com" },
    { name: "人民出版社", slug: "people-press", country: "China", officialWebsite: null },
    { name: "高等教育出版社", slug: "higher-education-press", country: "China", officialWebsite: "https://www.hep.com.cn" },
  ];

  const publisherMap: Record<string, string> = {};
  for (const p of publishers) {
    const saved = await prisma.publisher.upsert({
      where: { slug: p.slug },
      update: {},
      create: p,
    });
    publisherMap[p.slug] = saved.id;
  }

  // 3. Dictionaries: 收录网站 / 期刊形式 / 核心收录类型 / 所属领域
  const indexingDatabases = [
    { name: "中国知网", slug: "cnki" },
    { name: "维普", slug: "vip" },
    { name: "万方", slug: "wanfang" },
    { name: "龙源期刊", slug: "longyuan" },
  ];
  const indexingMap: Record<string, string> = {};
  for (const [i, d] of indexingDatabases.entries()) {
    const saved = await prisma.indexingDatabase.upsert({
      where: { slug: d.slug },
      update: {},
      create: { name: d.name, slug: d.slug, sortOrder: i },
    });
    indexingMap[d.slug] = saved.id;
  }

  const formats = [
    { name: "电子刊", slug: "electronic" },
    { name: "国际刊", slug: "international" },
    { name: "纸质刊", slug: "print" },
  ];
  const formatMap: Record<string, string> = {};
  for (const [i, f] of formats.entries()) {
    const saved = await prisma.journalFormat.upsert({
      where: { slug: f.slug },
      update: {},
      create: { name: f.name, slug: f.slug, sortOrder: i },
    });
    formatMap[f.slug] = saved.id;
  }

  const indexes = [
    { name: "北大核心", slug: "pku-core" },
    { name: "CSSCI", slug: "cssci" },
    { name: "CSCD", slug: "cscd" },
    { name: "科技核心", slug: "tech-core" },
    { name: "EI", slug: "ei" },
    { name: "SCI", slug: "sci" },
    { name: "SSCI", slug: "ssci" },
    { name: "ESCI", slug: "esci" },
    { name: "Scopus", slug: "scopus" },
    { name: "其他", slug: "other" },
  ];
  const indexMap: Record<string, string> = {};
  for (const [i, ix] of indexes.entries()) {
    const saved = await prisma.journalIndex.upsert({
      where: { slug: ix.slug },
      update: {},
      create: { name: ix.name, slug: ix.slug, sortOrder: i },
    });
    indexMap[ix.slug] = saved.id;
  }

  const fields = [
    { name: "人文", slug: "humanities" },
    { name: "社会科学", slug: "social-sciences" },
    { name: "理工", slug: "science-engineering" },
    { name: "医学", slug: "medicine" },
    { name: "教育", slug: "education" },
    { name: "经济", slug: "economics" },
    { name: "管理", slug: "management" },
    { name: "法学", slug: "law" },
    { name: "语言文学", slug: "language-literature" },
    { name: "艺术", slug: "arts" },
    { name: "新闻传播", slug: "journalism-communication" },
    { name: "计算机", slug: "computer" },
    { name: "工程技术", slug: "engineering-technology" },
    { name: "自然科学", slug: "natural-sciences" },
    { name: "农业", slug: "agriculture" },
    { name: "其他", slug: "other" },
  ];
  const fieldMap: Record<string, string> = {};
  for (const [i, f] of fields.entries()) {
    const saved = await prisma.field.upsert({
      where: { slug: f.slug },
      update: {},
      create: { name: f.name, slug: f.slug, sortOrder: i },
    });
    fieldMap[f.slug] = saved.id;
  }

  // 4. Journals (3 journals, A has two channels)
  const syncJournal = async (
    journalId: string,
    opts: {
      indexing: string[];
      formats: string[];
      indexes: string[];
      fields: string[];
    }
  ) => {
    await prisma.journal.update({
      where: { id: journalId },
      data: {
        indexingDatabases: { deleteMany: {}, create: opts.indexing.map((s) => ({ database: { connect: { id: indexingMap[s] } } })) },
        formats: { deleteMany: {}, create: opts.formats.map((s) => ({ format: { connect: { id: formatMap[s] } } })) },
        indexes: { deleteMany: {}, create: opts.indexes.map((s) => ({ index: { connect: { id: indexMap[s] } } })) },
        fields: { deleteMany: {}, create: opts.fields.map((s) => ({ field: { connect: { id: fieldMap[s] } } })) },
      },
    });
  };

  const ensureJournal = async (
    title: string,
    publisherSlug: string,
    data: {
      description: string;
      level: JournalLevel;
      createdById: string;
      attributes: { indexing: string[]; formats: string[]; indexes: string[]; fields: string[] };
      channels: JournalSourceInput[];
    }
  ) => {
    const publisherId = publisherMap[publisherSlug];
    const existing = await prisma.journal.findFirst({ where: { title, publisherId } });
    const journal = existing
      ? await prisma.journal.update({
          where: { id: existing.id },
          data: {
            description: data.description,
            level: data.level,
            status: JournalStatus.PUBLISHED,
            publishedAt: existing.publishedAt ?? new Date(),
          },
        })
      : await prisma.journal.create({
          data: {
            title,
            publisherId,
            description: data.description,
            level: data.level,
            status: JournalStatus.PUBLISHED,
            createdById: data.createdById,
            publishedAt: new Date(),
          },
        });

    await syncJournal(journal.id, data.attributes);

    const sources: { costPrice: number | null; salePrice: number | null; currency: string }[] = [];
    for (const [i, ch] of data.channels.entries()) {
      await upsertJournalSource(journal.id, { ...ch, sortOrder: i });
      sources.push({ costPrice: ch.costPrice ?? null, salePrice: ch.salePrice, currency: ch.currency });
    }
    const min = pickMinPrices(sources);
    await prisma.journal.update({
      where: { id: journal.id },
      data: {
        minCostPrice: min.minCostPrice,
        minSalePrice: min.minSalePrice,
        currency: min.currency,
      },
    });
    return journal;
  };

  await ensureJournal("IEEE模式分析与机器智能汇刊", "ieee", {
    description: "模式分析与机器智能领域的旗舰汇刊，收录人工智能、计算机视觉、模式识别研究。",
    level: JournalLevel.CORE,
    createdById: admin.id,
    attributes: { indexing: ["cnki", "wanfang"], formats: ["electronic", "international"], indexes: ["ei"], fields: ["computer", "engineering-technology"] },
    channels: [
      { sourceName: "IEEE 官方直购", sourceType: "直签", contactName: "陈老师", costPrice: 10000, salePrice: 12800, currency: "JPY" },
      { sourceName: "国内代理渠道", sourceType: "代理", contactName: "王经理", costPrice: 11800, salePrice: 12500, currency: "JPY" },
    ],
  });

  await ensureJournal("IEEE软件工程汇刊", "ieee", {
    description: "软件工程领域顶级汇刊，覆盖需求工程、软件架构、测试与维护。",
    level: JournalLevel.ORDINARY,
    createdById: admin.id,
    attributes: { indexing: ["cnki", "vip"], formats: ["print"], indexes: [], fields: ["education", "humanities"] },
    channels: [
      { sourceName: "IEEE 官方直购", sourceType: "直签", contactName: "陈老师", costPrice: 15000, salePrice: 18000, currency: "JPY" },
    ],
  });

  await ensureJournal("自然-机器智能", "springer-nature", {
    description: "Nature 旗下机器智能与 AI 应用方向的高影响力期刊。",
    level: JournalLevel.CORE,
    createdById: editor.id,
    attributes: { indexing: ["wanfang", "longyuan"], formats: ["electronic"], indexes: ["tech-core"], fields: ["medicine"] },
    channels: [
      { sourceName: "出版社直购", sourceType: "直签", contactName: "李老师", costPrice: 8000, salePrice: 10600, currency: "JPY" },
    ],
  });

  console.log("Created journals: IEEE模式分析与机器智能汇刊(2渠道), IEEE软件工程汇刊, 自然-机器智能");

  // 5. Software copyrights (2)
  const ensureCopyright = async (data: {
    name: string;
    shortName?: string;
    registrationNo?: string;
    copyrightOwner?: string;
    description?: string;
    note?: string;
    type: CopyrightType;
    createdById: string;
    channels: JournalSourceInput[];
  }) => {
    let c = await prisma.softwareCopyright.findFirst({ where: { name: data.name } });
    if (c) {
      c = await prisma.softwareCopyright.update({
        where: { id: c.id },
        data: {
          shortName: data.shortName ?? null,
          registrationNo: data.registrationNo ?? null,
          copyrightOwner: data.copyrightOwner ?? null,
          description: data.description ?? null,
          note: data.note ?? null,
          type: data.type,
          status: ResourceStatus.PUBLISHED,
          publishedAt: c.publishedAt ?? new Date(),
        },
      });
    } else {
      c = await prisma.softwareCopyright.create({
        data: {
          name: data.name,
          shortName: data.shortName ?? null,
          registrationNo: data.registrationNo ?? null,
          copyrightOwner: data.copyrightOwner ?? null,
          description: data.description ?? null,
          note: data.note ?? null,
          type: data.type,
          status: ResourceStatus.PUBLISHED,
          createdById: data.createdById,
          publishedAt: new Date(),
        },
      });
    }
    const sources: { costPrice: number | null; salePrice: number | null; currency: string }[] = [];
    for (const [i, ch] of data.channels.entries()) {
      await upsertCopyrightSource(c.id, { ...ch, sortOrder: i });
      sources.push({ costPrice: ch.costPrice ?? null, salePrice: ch.salePrice, currency: ch.currency });
    }
    const min = pickMinPrices(sources);
    await prisma.softwareCopyright.update({
      where: { id: c.id },
      data: { minCostPrice: min.minCostPrice, minSalePrice: min.minSalePrice, currency: min.currency },
    });
    return c;
  };

  await ensureCopyright({
    name: "企业知识管理平台软件",
    shortName: "知识管理平台",
    registrationNo: "2026SR0000001",
    copyrightOwner: "某某科技有限公司",
    description: "面向企业的知识文档沉淀、检索与权限管理平台。",
    type: CopyrightType.NORMAL,
    createdById: admin.id,
    channels: [{ sourceName: "代理机构A", sourceType: "代理", contactName: "赵专员", costPrice: 2000, salePrice: 2800, currency: "CNY" }],
  });
  await ensureCopyright({
    name: "智能排班调度系统",
    shortName: "排班调度系统",
    registrationNo: "2026SR0000002",
    copyrightOwner: "某某科技有限公司",
    description: "基于规则的智能排班与冲突检测系统，支持加急办理。",
    note: "支持加急办理，材料齐全 5 个工作日下证。",
    type: CopyrightType.URGENT,
    createdById: editor.id,
    channels: [{ sourceName: "加急代理渠道", sourceType: "代理", contactName: "孙经理", costPrice: 3500, salePrice: 4800, currency: "CNY" }],
  });
  console.log("Created software copyrights: 企业知识管理平台软件, 智能排班调度系统");

  // 6. Patents (2)
  const ensurePatent = async (data: {
    name: string;
    description?: string;
    note?: string;
    type: PatentType;
    createdById: string;
    channels: JournalSourceInput[];
  }) => {
    let p = await prisma.patent.findFirst({ where: { name: data.name } });
    if (p) {
      p = await prisma.patent.update({
        where: { id: p.id },
        data: {
          description: data.description ?? null,
          note: data.note ?? null,
          type: data.type,
          status: ResourceStatus.PUBLISHED,
          publishedAt: p.publishedAt ?? new Date(),
        },
      });
    } else {
      p = await prisma.patent.create({
        data: {
          name: data.name,
          description: data.description ?? null,
          note: data.note ?? null,
          type: data.type,
          status: ResourceStatus.PUBLISHED,
          createdById: data.createdById,
          publishedAt: new Date(),
        },
      });
    }
    const sources: { costPrice: number | null; salePrice: number | null; currency: string }[] = [];
    for (const [i, ch] of data.channels.entries()) {
      await upsertPatentSource(p.id, { ...ch, sortOrder: i });
      sources.push({ costPrice: ch.costPrice ?? null, salePrice: ch.salePrice, currency: ch.currency });
    }
    const min = pickMinPrices(sources);
    await prisma.patent.update({
      where: { id: p.id },
      data: { minCostPrice: min.minCostPrice, minSalePrice: min.minSalePrice, currency: min.currency },
    });
    return p;
  };

  await ensurePatent({
    name: "一种基于边缘计算的实时视频分析方法",
    description: "发明专利，覆盖边缘节点视频流实时分析。",
    type: PatentType.INVENTION,
    createdById: admin.id,
    channels: [{ sourceName: "专利代理所A", sourceType: "代理", contactName: "周律师", costPrice: 8000, salePrice: 12000, currency: "CNY" }],
  });
  await ensurePatent({
    name: "一种可折叠太阳能充电装置",
    description: "实用新型专利，便携式可折叠太阳能充电装置。",
    type: PatentType.UTILITY_MODEL,
    createdById: editor.id,
    channels: [{ sourceName: "专利代理所B", sourceType: "代理", contactName: "吴专员", costPrice: 2500, salePrice: 3800, currency: "CNY" }],
  });
  console.log("Created patents: 边缘计算视频分析(发明), 可折叠太阳能充电装置(实用新型)");

  // 7. Trademark services (2)
  const ensureTrademark = async (data: {
    name: string;
    description?: string;
    note?: string;
    createdById: string;
    channels: (JournalSourceInput & { times?: number })[];
  }) => {
    let t = await prisma.trademarkService.findFirst({ where: { name: data.name } });
    if (t) {
      t = await prisma.trademarkService.update({
        where: { id: t.id },
        data: {
          description: data.description ?? null,
          note: data.note ?? null,
          status: ResourceStatus.PUBLISHED,
          publishedAt: t.publishedAt ?? new Date(),
        },
      });
    } else {
      t = await prisma.trademarkService.create({
        data: {
          name: data.name,
          description: data.description ?? null,
          note: data.note ?? null,
          status: ResourceStatus.PUBLISHED,
          createdById: data.createdById,
          publishedAt: new Date(),
        },
      });
    }
    const sources: { costPrice: number | null; salePrice: number | null; currency: string }[] = [];
    for (const [i, ch] of data.channels.entries()) {
      await upsertTrademarkSource(t.id, { ...ch, sortOrder: i });
      sources.push({ costPrice: ch.costPrice ?? null, salePrice: ch.salePrice, currency: ch.currency });
    }
    const min = pickMinPrices(sources);
    await prisma.trademarkService.update({
      where: { id: t.id },
      data: { minCostPrice: min.minCostPrice, minSalePrice: min.minSalePrice, currency: min.currency },
    });
    return t;
  };

  await ensureTrademark({
    name: "图形商标注册服务",
    description: "图形商标注册代办，含材料审核与流程跟进。",
    createdById: admin.id,
    channels: [{ sourceName: "商标代理机构C", sourceType: "代理", contactName: "郑经理", costPrice: 800, salePrice: 1600, currency: "CNY", times: 1 }],
  });
  await ensureTrademark({
    name: "文字商标注册服务（全类）",
    description: "文字商标多类别打包注册服务。",
    note: "支持一标多类与优先权主张。",
    createdById: editor.id,
    channels: [{ sourceName: "商标代理机构D", sourceType: "代理", contactName: "冯专员", costPrice: 1200, salePrice: 2200, currency: "CNY", times: 1 }],
  });
  console.log("Created trademark services: 图形商标注册服务, 文字商标注册服务（全类）");

  // Audit log
  await prisma.auditLog.create({
    data: {
      userId: admin.id,
      action: "INIT_SEED",
      targetEntity: "system",
      targetId: admin.id,
      details: JSON.stringify({ message: "Initial seed data loaded successfully" }),
    },
  });

  console.log("Database seeded successfully!");
}

main()
  .catch((e) => {
    console.error("Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
