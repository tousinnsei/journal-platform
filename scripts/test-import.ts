import { PrismaClient } from "@prisma/client";
import * as XLSX from "xlsx";
import {
  buildImportPreview,
  confirmJournalImport,
} from "../lib/journal-import";

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

function buildWorkbook(stamp: string, extraChannel: boolean, altPublisher = false): Buffer {
  const t1 = `导入测试-现代通信技术-${stamp}`;
  const t2 = `导入测试-大数据研究-${stamp}`;
  const t3 = `导入测试-材料科学进展-${stamp}`;
  const p1 = `导入测试-电子科技集团-${stamp}`;
  const p2 = `导入测试-邮电出版社-${stamp}`;
  const p2b = `导入测试-信息出版社-${stamp}`;
  const p3 = `导入测试-科学出版社-${stamp}`;

  const sheet1Headers = [
    "期刊名称",
    "出版社",
    "官方网站",
    "期刊级别",
    "收录",
    "形式",
    "核心类型",
    "领域",
    "来源渠道",
    "渠道类型",
    "联系人姓名",
    "联系方式",
    "微信号",
    "原价",
    "售价",
    "渠道备注",
  ];
  const sheet1Rows = [
    [t1, p1, "https://mct.example.com", "核心", "知网、万方", "纸质、电子", "北大核心", "通信工程", "学术代理A", "中介", "张伟", "13800138000", "zhangwei", "120", "200", "电话联系"],
    [t1, p1, "", "核心", "", "", "", "", "学术代理B", "中介", "李娜", "", "", "130", "220", ""],
    [t2, altPublisher ? p2b : p2, "http://bd.example.com", "普通", "万方", "电子", "", "大数据", "数据库经销商", "直销", "", "", "", "90", "168", ""],
    [t3, p3, "", "普通", "知网", "纸质", "", "材料学", "材料渠道", "", "", "", "", "80", "", ""],
    ["", "", "", "", "", "", "", "", "无名渠道", "", "", "", "", "50", "", ""],
  ];

  const sheet2Headers = ["期刊名称", "出版社", "来源渠道", "原价", "售价"];
  const sheet2Rows = [
    [t2, altPublisher ? p2b : p2, "出版社直营", "85", "160"],
    [t1, p1, "微信渠道", "125", "210"],
  ];
  if (extraChannel) {
    sheet2Rows.push([t2, altPublisher ? p2b : p2, "出版社直营2", "75", "155"]);
  }

  const wb = XLSX.utils.book_new();
  const ws1 = XLSX.utils.aoa_to_sheet([sheet1Headers, ...sheet1Rows]);
  const ws2 = XLSX.utils.aoa_to_sheet([sheet2Headers, ...sheet2Rows]);
  XLSX.utils.book_append_sheet(wb, ws1, "期刊数据");
  XLSX.utils.book_append_sheet(wb, ws2, "补充渠道");

  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
}

async function main() {
  console.log("Journal import pipeline tests\n");
  const admin = await prisma.user.findFirst();
  if (!admin) {
    throw new Error("数据库没有用户，请先运行 prisma db seed");
  }

  const stamp = String(Date.now());
  const t1 = `导入测试-现代通信技术-${stamp}`;
  const t2 = `导入测试-大数据研究-${stamp}`;
  const t3 = `导入测试-材料科学进展-${stamp}`;
  const fileName = `test-import-${stamp}.xlsx`;
  const fileA = buildWorkbook(stamp, false);
  const fileB = buildWorkbook(stamp, true);

  // ---- Preview ----
  console.log("Preview (fileA)");
  const preview = await buildImportPreview(fileA, fileName);
  check("totalRows === 7", preview.totalRows === 7, `(got ${preview.totalRows})`);
  check("totalGroups === 3", preview.totalGroups === 3, `(got ${preview.totalGroups})`);
  check("okRows === 5", preview.okRows === 5, `(got ${preview.okRows})`);
  check("errorRows === 2", preview.errorRows === 2, `(got ${preview.errorRows})`);
  check("newGroups === 2", preview.newGroups === 2, `(got ${preview.newGroups})`);
  check("errorGroups === 1", preview.errorGroups === 1, `(got ${preview.errorGroups})`);
  const g1 = preview.groups.find((g) => g.title.includes("现代通信技术"));
  check("group 1 has 3 sources", g1?.sources.length === 3, `(got ${g1?.sources.length})`);
  const g2 = preview.groups.find((g) => g.title.includes("大数据研究"));
  check("group 2 has 2 sources", g2?.sources.length === 2, `(got ${g2?.sources.length})`);
  const bad = preview.rowErrors.find((r) => r.title.includes("材料科学进展"));
  check("missing-sale-price row flagged", Boolean(bad), bad ? bad.errors.join(";") : "no error row");
  check(
    "new dict values include 知网 / 北大核心 / 通信工程",
    preview.newDictValues.indexing.includes("知网") &&
      preview.newDictValues.coreTypes.includes("北大核心") &&
      preview.newDictValues.fields.includes("通信工程"),
    JSON.stringify(preview.newDictValues)
  );

  // ---- First import (create) ----
  console.log("\nImport #1 (create)");
  const r1 = await confirmJournalImport({
    file: fileA,
    fileName,
    decisions: [],
    status: "PENDING",
    userId: admin.id,
  });
  check("newJournalCount === 2", r1.newJournalCount === 2, `(got ${r1.newJournalCount})`);
  check("newSourceCount === 5", r1.newSourceCount === 5, `(got ${r1.newSourceCount})`);
  check("successRows === 5", r1.successRows === 5, `(got ${r1.successRows})`);
  check("errorRows === 2", r1.errorRows === 2, `(got ${r1.errorRows})`);
  check("skippedRows === 0", r1.skippedRows === 0, `(got ${r1.skippedRows})`);
  check("mergedCount === 0", r1.mergedCount === 0, `(got ${r1.mergedCount})`);

  const createdT1 = await prisma.journal.findFirst({
    where: { title: t1 },
    include: { sources: true },
  });
  check("journal 1 created", Boolean(createdT1));
  check("journal 1 has 3 sources", createdT1?.sources.length === 3, `(got ${createdT1?.sources.length})`);
  check("journal 1 minSalePrice === 200", createdT1?.minSalePrice === 200, `(got ${createdT1?.minSalePrice})`);
  check("journal 1 minCostPrice === 120", createdT1?.minCostPrice === 120, `(got ${createdT1?.minCostPrice})`);
  check("journal 1 level CORE", createdT1?.level === "CORE", `(got ${createdT1?.level})`);
  check("journal 1 status PENDING", createdT1?.status === "PENDING", `(got ${createdT1?.status})`);

  const createdT2 = await prisma.journal.findFirst({
    where: { title: t2 },
    include: { sources: true },
  });
  check("journal 2 created", Boolean(createdT2));
  check("journal 2 has 2 sources", createdT2?.sources.length === 2, `(got ${createdT2?.sources.length})`);
  check("journal 2 minSalePrice === 160", createdT2?.minSalePrice === 160, `(got ${createdT2?.minSalePrice})`);
  check("journal 2 minCostPrice === 85", createdT2?.minCostPrice === 85, `(got ${createdT2?.minCostPrice})`);

  const t3check = await prisma.journal.findFirst({ where: { title: t3 } });
  check("all-bad group did not create an empty journal", !t3check);

  check(
    "dict entries created (知网/北大核心/通信工程)",
    Boolean(
      await prisma.indexingDatabase.findUnique({ where: { name: "知网" } }) &&
        (await prisma.journalIndex.findUnique({ where: { name: "北大核心" } })) &&
        (await prisma.field.findUnique({ where: { name: "通信工程" } }))
    )
  );

  const importLog = await prisma.importLog.findFirst({ where: { fileName } });
  check("import log written", Boolean(importLog));
  check("import log module JOURNAL", importLog?.module === "JOURNAL");

  // ---- Second import (identical file -> duplicates merged) ----
  console.log("\nImport #2 (duplicate detection + merge)");
  const r2 = await confirmJournalImport({
    file: fileA,
    fileName,
    decisions: [],
    status: "PENDING",
    userId: admin.id,
  });
  check("mergedCount === 2", r2.mergedCount === 2, `(got ${r2.mergedCount})`);
  check("newSourceCount === 0 (identical channels deduped)", r2.newSourceCount === 0, `(got ${r2.newSourceCount})`);
  check("successRows === 5", r2.successRows === 5, `(got ${r2.successRows})`);

  const unchangedT2 = await prisma.journal.findFirst({
    where: { title: t2 },
    include: { sources: true },
  });
  check("journal 2 sources unchanged after merge", unchangedT2?.sources.length === 2, `(got ${unchangedT2?.sources.length})`);

  // ---- Third import (extra channel appended) ----
  console.log("\nImport #3 (merge adds a new channel)");
  const r3 = await confirmJournalImport({
    file: fileB,
    fileName,
    decisions: [],
    status: "PENDING",
    userId: admin.id,
  });
  check("mergedCount === 2", r3.mergedCount === 2, `(got ${r3.mergedCount})`);
  check("newSourceCount === 1", r3.newSourceCount === 1, `(got ${r3.newSourceCount})`);
  check("successRows === 6", r3.successRows === 6, `(got ${r3.successRows})`);

  const mergedT2 = await prisma.journal.findFirst({
    where: { title: t2 },
    include: { sources: true },
  });
  check("journal 2 now has 3 sources", mergedT2?.sources.length === 3, `(got ${mergedT2?.sources.length})`);
  check("journal 2 minSalePrice === 155", mergedT2?.minSalePrice === 155, `(got ${mergedT2?.minSalePrice})`);
  check("journal 2 minCostPrice === 75", mergedT2?.minCostPrice === 75, `(got ${mergedT2?.minCostPrice})`);

  // ---- Fourth import (similar duplicate: same title, different publisher -> CREATE by default) ----
  console.log("\nImport #4 (similar duplicate defaults to CREATE)");
  const fileC = buildWorkbook(stamp, false, true);
  const previewC = await buildImportPreview(fileC, fileName);
  const similarGroup = previewC.groups.find((g) => g.title === t2);
  check("t2 group flagged as similar duplicate", similarGroup?.status === "DUPLICATE" && similarGroup.duplicateKind === "similar", `(got ${similarGroup?.status}/${similarGroup?.duplicateKind})`);
  const r4 = await confirmJournalImport({
    file: fileC,
    fileName,
    decisions: [],
    status: "PENDING",
    userId: admin.id,
  });
  check("newJournalCount === 1 (similar title gets its own journal)", r4.newJournalCount === 1, `(got ${r4.newJournalCount})`);
  check("mergedCount === 1 (exact duplicate still merged)", r4.mergedCount === 1, `(got ${r4.mergedCount})`);
  check("newSourceCount === 2 (channels on the new journal)", r4.newSourceCount === 2, `(got ${r4.newSourceCount})`);

  const altPub = await prisma.publisher.findFirst({ where: { name: `导入测试-信息出版社-${stamp}` } });
  const altT2 = await prisma.journal.findFirst({
    where: { title: t2, publisherId: altPub?.id },
    include: { sources: true },
  });
  check("new journal created for t2 under the other publisher", Boolean(altT2), `(publisher ${altPub?.name ?? "missing"})`);
  check("alt journal has 2 sources", altT2?.sources.length === 2, `(got ${altT2?.sources.length})`);
  const origT2After = await prisma.journal.findFirst({
    where: { title: t2, publisherId: createdT2?.publisherId },
    include: { sources: true },
  });
  check("original t2 journal untouched", origT2After?.sources.length === 3, `(got ${origT2After?.sources.length})`);

  // ---- Fifth import (similar duplicate explicitly merged) ----
  console.log("\nImport #5 (similar duplicate explicitly merged)");
  const t2GroupC = previewC.groups.find((g) => g.title === t2);
  const r5 = await confirmJournalImport({
    file: fileC,
    fileName,
    decisions: [
      { key: t2GroupC!.key, action: "MERGE", existingJournalId: createdT2!.id },
    ],
    status: "PENDING",
    userId: admin.id,
  });
  check("mergedCount === 2 (exact + explicit similar)", r5.mergedCount === 2, `(got ${r5.mergedCount})`);
  check("newJournalCount === 0", r5.newJournalCount === 0, `(got ${r5.newJournalCount})`);
  const altT2After = await prisma.journal.findFirst({ where: { id: altT2?.id }, include: { sources: true } });
  check("alt journal untouched by explicit merge", altT2After?.sources.length === 2, `(got ${altT2After?.sources.length})`);
  const origT2Merged = await prisma.journal.findFirst({
    where: { title: t2, publisherId: createdT2?.publisherId },
    include: { sources: true },
  });
  check("original t2 unchanged after explicit merge", origT2Merged?.sources.length === 3, `(got ${origT2Merged?.sources.length})`);

  await prisma.$disconnect();

  if (failures > 0) {
    console.log(`\n${failures} check(s) FAILED`);
    process.exit(1);
  }
  console.log("\nAll import checks passed");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
