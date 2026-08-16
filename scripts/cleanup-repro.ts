import { PrismaClient } from "@prisma/client";

const p = new PrismaClient();

async function main() {
  const prefixes = ["测试期刊", "批量测试J", "并发测试期刊", "测试出版社A", "批量出版社", "并发出版社X"];

  const jids = (
    await p.journal.findMany({
      where: { OR: prefixes.map((x) => ({ title: { startsWith: x } })) },
      select: { id: true },
    })
  ).map((x) => x.id);
  await p.journalSource.deleteMany({ where: { journalId: { in: jids } } });
  await p.journalCategory.deleteMany({ where: { journalId: { in: jids } } });
  await p.journalIndexing.deleteMany({ where: { journalId: { in: jids } } });
  await p.journalFormatLink.deleteMany({ where: { journalId: { in: jids } } });
  await p.journalIndexLink.deleteMany({ where: { journalId: { in: jids } } });
  await p.journalField.deleteMany({ where: { journalId: { in: jids } } });
  await p.journal.deleteMany({ where: { id: { in: jids } } });

  const pids = (
    await p.publisher.findMany({
      where: { OR: prefixes.map((x) => ({ name: { startsWith: x } })) },
      select: { id: true },
    })
  ).map((x) => x.id);
  await p.publisher.deleteMany({ where: { id: { in: pids } } });

  await p.importLog.deleteMany({ where: { fileName: { startsWith: "repro-batch-" } } });
  await p.auditLog.deleteMany({ where: { action: { in: ["CREATE_JOURNAL", "IMPORT_JOURNALS"] }, targetEntity: "journals" } });

  console.log("cleaned journals:", jids.length, "publishers:", pids.length);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => p.$disconnect());
