import { PrismaClient } from "@prisma/client";
import * as XLSX from "xlsx";
import { findOrCreatePublisher } from "../lib/admin-journal";
import { buildImportPreview, confirmJournalImport } from "../lib/journal-import";

const prisma = new PrismaClient();
let failures = 0;

function check(name: string, ok: boolean, extra = "") {
  if (ok) {
    console.log(`  ✓ ${name}`);
  } else {
    failures += 1;
    console.log(`  ✗ ${name} ${extra}`);
  }
}

async function main() {
  console.log("Publisher / FK integrity tests\n");

  const admin = await prisma.user.findFirst();
  if (!admin) throw new Error("数据库没有用户，请先运行 prisma db seed");

  const stamp = String(Date.now());
  const pubA = `测试出版社A-${stamp}`;
  const pubB = `测试出版社B-${stamp}`;
  const pubC = `测试出版社C-${stamp}`;

  // ---- 测试1 + 测试2: find-or-create + reuse ----
  console.log("Publisher create + reuse");
  const p1 = await findOrCreatePublisher(pubA);
  const p2 = await findOrCreatePublisher(`  ${pubA}  `);
  const p3 = await findOrCreatePublisher(pubA);
  check("测试1: publisher auto-created", Boolean(p1.id));
  check("测试2: same name reused (same row)", p1.id === p2.id && p1.id === p3.id, `(${p1.id} / ${p2.id} / ${p3.id})`);

  // Concurrency: 6 parallel find-or-create converge to exactly one row.
  const concurrent = await Promise.all(
    Array.from({ length: 6 }, () => findOrCreatePublisher(pubB))
  );
  const uniqueIds = new Set(concurrent.map((r) => r.id));
  check("并发: 6 parallel creates converge to 1 publisher", uniqueIds.size === 1, `(got ${uniqueIds.size})`);

  check(
    "exactly 1 publisher row for A",
    (await prisma.publisher.count({ where: { name: pubA } })) === 1
  );
  check(
    "exactly 1 publisher row for B",
    (await prisma.publisher.count({ where: { name: pubB } })) === 1
  );

  // ---- 测试3 + 测试4 + 测试5: Excel import ----
  console.log("\nExcel import (10 journals / 3 publishers)");
  const titles = Array.from({ length: 10 }, (_, i) => `批量期刊${i + 1}-${stamp}`);
  const pubOf = (i: number) => (i <= 5 ? pubA : i <= 8 ? pubB : pubC);
  const headers = ["期刊名称", "出版社", "来源渠道", "渠道类型", "联系人姓名", "联系方式", "原价", "售价", "货币", "渠道备注"];
  const rows: (string | number)[][] = [];
  // 5 journals use publisher A, 3 use B, 2 use C. Journal 1 appears twice
  // (two channels) -> must become a single journal with 2 sources.
  for (let i = 1; i <= 10; i += 1) {
    rows.push([titles[i - 1], pubOf(i), `渠道${i}a`, "代理", `联系人${i}`, `1380000${String(i).padStart(4, "0")}`, 50 + i, 100 + i, "cny", ""]);
  }
  rows.push([titles[0], pubA, "渠道1b", "直签", "第二渠道联系人", "13900000000", 60, 110, "CNY", "加急"]);

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([headers, ...rows]), "期刊数据");
  const file = XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
  const fileName = `test-pub-${stamp}.xlsx`;

  const preview = await buildImportPreview(file, fileName);
  check("测试3: totalGroups === 10", preview.totalGroups === 10, `(got ${preview.totalGroups})`);
  check("测试3: errorRows === 0", preview.errorRows === 0, `(got ${preview.errorRows})`);
  // A and B already exist from the earlier find-or-create tests, so only C
  // should be reported as "new". A/B must NOT be re-created.
  check(
    "测试3: only the truly-new publisher C is reported",
    preview.newDictValues.publishers.length === 1 &&
      preview.newDictValues.publishers[0] === pubC,
    JSON.stringify(preview.newDictValues.publishers)
  );

  const r = await confirmJournalImport({
    file,
    fileName,
    decisions: [],
    status: "PENDING",
    userId: admin.id,
  });
  check("测试3: newJournalCount === 10", r.newJournalCount === 10, `(got ${r.newJournalCount})`);
  check("测试3: newSourceCount === 11", r.newSourceCount === 11, `(got ${r.newSourceCount})`);

  const pubCount = await prisma.publisher.count({ where: { name: { in: [pubA, pubB, pubC] } } });
  check("测试3: exactly 3 publishers in DB", pubCount === 3, `(got ${pubCount})`);
  const journalCount = await prisma.journal.count({
    where: { title: { in: titles } },
  });
  check("测试3: exactly 10 journals in DB", journalCount === 10, `(got ${journalCount})`);

  const j1 = await prisma.journal.findFirst({
    where: { title: titles[0] },
    include: { sources: { orderBy: { sortOrder: "asc" } }, publisher: true },
  });
  check("测试4: journal 1 has 2 channels (not 2 journals)", j1?.sources.length === 2, `(got ${j1?.sources.length})`);
  check("测试4: journal 1 publisher is A", j1?.publisher.name === pubA);
  const s1 = j1?.sources[0];
  check(
    "测试5: contact + cost + sale + currency saved",
    s1?.contactName === "联系人1" && s1?.costPrice === 51 && s1?.salePrice === 101 && s1?.currency === "CNY",
    JSON.stringify(s1)
  );
  const s1b = j1?.sources[1];
  check(
    "测试5: second channel data saved",
    s1b?.contactName === "第二渠道联系人" && s1b?.salePrice === 110 && s1b?.costPrice === 60,
    JSON.stringify(s1b)
  );
  check("测试5: journal 1 minSalePrice === 101", j1?.minSalePrice === 101, `(got ${j1?.minSalePrice})`);
  check("测试5: journal 1 minCostPrice === 51", j1?.minCostPrice === 51, `(got ${j1?.minCostPrice})`);

  // ---- 测试6 + 测试7: persistence (fresh connection = after app restart) ----
  console.log("\nPersistence (fresh connection)");
  const fresh = new PrismaClient();
  const freshJournalCount = await fresh.journal.count({ where: { title: { in: titles } } });
  const freshPubCount = await fresh.publisher.count({ where: { name: { in: [pubA, pubB, pubC] } } });
  const freshSources = await fresh.journalSource.count({
    where: { journal: { title: { in: titles } } },
  });
  check("测试6/7: data survives a fresh connection", freshJournalCount === 10 && freshPubCount === 3 && freshSources === 11, `(J ${freshJournalCount} P ${freshPubCount} S ${freshSources})`);
  await fresh.$disconnect();

  // ---- Re-import the same file => merge, no new rows ----
  const r2 = await confirmJournalImport({
    file,
    fileName,
    decisions: [],
    status: "PENDING",
    userId: admin.id,
  });
  check("re-import: merges, 0 new journals", r2.newJournalCount === 0, `(got ${r2.newJournalCount})`);
  check("re-import: 0 new sources (deduped)", r2.newSourceCount === 0, `(got ${r2.newSourceCount})`);

  // ---- Empty publisher blocked ----
  console.log("\nEmpty publisher");
  const emptyWb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(
    emptyWb,
    XLSX.utils.aoa_to_sheet([
      ["期刊名称", "出版社", "来源渠道", "售价"],
      [`无出版社期刊-${stamp}`, "", "渠道X", 99],
    ]),
    "Sheet1"
  );
  const emptyFile = XLSX.write(emptyWb, { type: "buffer", bookType: "xlsx" }) as Buffer;
  const emptyPreview = await buildImportPreview(emptyFile, `empty-${stamp}.xlsx`);
  check("空出版社在预览阶段被拦截", emptyPreview.errorRows === 1, JSON.stringify(emptyPreview.rowErrors));
  const emptyResult = await confirmJournalImport({
    file: emptyFile,
    fileName: `empty-${stamp}.xlsx`,
    decisions: [],
    status: "PENDING",
    userId: admin.id,
  });
  check("空出版社不写入数据库", emptyResult.newJournalCount === 0 && emptyResult.errorRows === 1, `(new ${emptyResult.newJournalCount} err ${emptyResult.errorRows})`);
  check(
    "空出版社未创建空 Publisher",
    (await prisma.publisher.count({ where: { name: "" } })) === 0
  );

  await prisma.$disconnect();

  if (failures > 0) {
    console.log(`\n${failures} check(s) FAILED`);
    process.exit(1);
  }
  console.log("\nAll publisher/FK checks passed");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
