import * as XLSX from "xlsx";

const BASE = "http://localhost:3000";
const stamp = Date.now();

const login = await fetch(`${BASE}/api/v1/auth/login`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ email: "admin@journal.org", password: "admin123456" }),
});
const cookie = (login.headers.get("set-cookie") || "").split(";")[0];

function show(name, res, body) {
  console.log(`\n--- ${name} ---`);
  console.log("status:", res.status);
  const b = typeof body === "string" ? JSON.parse(body) : body;
  if (res.ok) {
    if (b.data?.id) console.log("OK id:", b.data.id);
    if (b.data?.newJournalCount != null)
      console.log(`OK newJournals=${b.data.newJournalCount} newSources=${b.data.newSourceCount} merged=${b.data.mergedCount}`);
  } else {
    console.log("FAILED message:", b.message);
    console.log("FAILED detail:", b.detail ?? "(none)");
    console.log("FAILED errorCode:", b.errorCode ?? "(none)", "field:", b.field ?? "(none)");
    if (b.data?.existingId) console.log("existingId:", b.data.existingId);
  }
  return b;
}

// Test B: manual create, existing publisher + one journal two channels (Test D)
const pubName = `既有出版社-${stamp}`;
await fetch(`${BASE}/api/v1/admin/publishers`, {
  method: "POST",
  headers: { "Content-Type": "application/json", Cookie: cookie },
  body: JSON.stringify({ name: pubName, slug: `pub-${stamp}` }),
});
{
  const payload = {
    title: `同一期刊双渠道-${stamp}`,
    publisherName: pubName,
    level: "ORDINARY",
    status: "DRAFT",
    indexing: ["知网"],
    fields: ["计算机"],
    sources: [
      { sourceName: "渠道X", costPrice: 100, salePrice: 200, currency: "CNY", status: "ACTIVE" },
      { sourceName: "渠道Y", costPrice: 150, salePrice: 260, currency: "CNY", status: "ACTIVE" },
    ],
  };
  const r = await fetch(`${BASE}/api/v1/admin/journals`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookie },
    body: JSON.stringify(payload),
  });
  show("Test B+D: manual create (existing publisher, 2 channels)", r, await r.text());
}

// Test H + J + F: Excel with new field, duplicate journal, multi-channel
const headers = ["期刊名称", "出版社", "收录网站", "期刊形式", "期刊级别", "所属领域", "来源渠道", "联系人", "原始价格", "售卖价格", "货币"];
const dupTitle = `重复期刊-${stamp}`;
const dupPub = `重复出版社-${stamp}`;
const rows = [
  [dupTitle, dupPub, "知网", "电子刊", "核心", "全新领域甲", "渠道1", "张老师", 500, 800, "CNY"],
  [dupTitle, dupPub, "", "", "", "", "渠道2", "李老师", 600, 900, "CNY"], // duplicate journal, second channel
  [`新领域期刊-${stamp}`, `新出版社-${stamp}`, "万方", "纸质刊", "普通", "全新领域乙,全新领域丙", "渠道3", "王老师", 100, 200, "CNY"], // brand new fields
];
const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([headers, ...rows]), "期刊数据");
const file = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
const fd = new FormData();
fd.append("file", new Blob([file], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), `场景-${stamp}.xlsx`);

console.log("\n=== PREVIEW ===");
const pvRes = await fetch(`${BASE}/api/v1/admin/journals/import/preview`, {
  method: "POST",
  headers: { Cookie: cookie },
  body: fd,
});
const pv = await pvRes.json();
console.log("preview status", pvRes.status);
if (pvRes.ok) {
  console.log("totalRows", pv.data.totalRows, "okRows", pv.data.okRows, "duplicateRows", pv.data.duplicateRows, "errorRows", pv.data.errorRows);
  console.log("newDictValues", JSON.stringify(pv.data.newDictValues));
  console.log("groups", pv.data.groups.map((g) => ({ title: g.title, status: g.status, duplicateKind: g.duplicateKind ?? null, sources: g.sources.length })));

  const decisions = pv.data.groups.map((g) => ({ key: g.key, action: g.status === "DUPLICATE" ? "MERGE" : "CREATE" }));
  const fd2 = new FormData();
  fd2.append("file", new Blob([file], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), `场景-${stamp}.xlsx`);
  fd2.append("status", "PENDING");
  fd2.append("decisions", JSON.stringify(decisions));
  const cfRes = await fetch(`${BASE}/api/v1/admin/journals/import/confirm`, {
    method: "POST",
    headers: { Cookie: cookie },
    body: fd2,
  });
  show("Test F+H+J: import (dup journal merge, new fields auto-create)", cfRes, await cfRes.text());
}

// Test I: Excel bad price -> should be preview error, not FK
const rowsI = [["坏价格期刊", `坏价格出版社-${stamp}`, "知网", "电子刊", "普通", "计算机", "渠道Z", "赵老师", "abc", -5, "CNY"]];
const wbI = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wbI, XLSX.utils.aoa_to_sheet([headers, ...rowsI]), "期刊数据");
const fileI = XLSX.write(wbI, { type: "buffer", bookType: "xlsx" });
const fdI = new FormData();
fdI.append("file", new Blob([fileI], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), `坏价格-${stamp}.xlsx`);
const pvI = await fetch(`${BASE}/api/v1/admin/journals/import/preview`, {
  method: "POST",
  headers: { Cookie: cookie },
  body: fdI,
});
const pvId = await pvI.json();
console.log("\n--- Test I: bad price ---");
console.log("preview status", pvI.status);
console.log("rowErrors", JSON.stringify(pvId.data?.rowErrors));

console.log("\n=== done ===");
