import * as XLSX from "xlsx";

const BASE = "http://localhost:3000";
const stamp = Date.now();

const login = await fetch(`${BASE}/api/v1/auth/login`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ email: "admin@journal.org", password: "admin123456" }),
});
const cookie = (login.headers.get("set-cookie") || "").split(";")[0];

// 10 rows:
//   rows 2-4: 《批量期刊A》 same journal, 3 different channels
//   rows 5-6: two rows using the same publisher 批量出版社B
//   rows 7-8: two rows using new publishers (批量出版社C, 批量出版社D)
//   row 9:  bad price
//   row 10: empty publisher
//   row 11: normal data
const headers = ["期刊名称", "出版社", "收录网站", "期刊形式", "期刊级别", "所属领域", "来源渠道", "联系人", "原始价格", "售卖价格", "货币"];
const rows = [
  [`《批量期刊A-${stamp}》`, `批量出版社A-${stamp}`, "知网,万方", "电子刊", "核心", "计算机,教育", "渠道A1", "张老师", 500, 800, "CNY"],
  [`《批量期刊A-${stamp}》`, `批量出版社A-${stamp}`, "", "", "核心", "", "渠道A2", "李老师", 600, 900, "CNY"],
  [`《批量期刊A-${stamp}》`, `批量出版社A-${stamp}`, "", "", "", "", "渠道A3", "王老师", 400, 700, "CNY"],
  [`批量期刊B1-${stamp}`, `批量出版社B-${stamp}`, "知网", "纸质刊", "普通", "理工", "渠道B", "赵老师", 100, 200, "CNY"],
  [`批量期刊B2-${stamp}`, `批量出版社B-${stamp}`, "万方", "电子", "普通", "医学", "渠道B2", "钱老师", 120, 220, "CNY"],
  [`批量期刊C-${stamp}`, `批量出版社C-${stamp}`, "维普", "国际刊", "普通", "经济", "渠道C", "孙老师", 300, 500, "CNY"],
  [`批量期刊D-${stamp}`, `批量出版社D-${stamp}`, "龙源期刊", "纸质刊", "核心", "管理", "渠道D", "周老师", 400, 600, "CNY"],
  [`批量期刊E-${stamp}`, `批量出版社E-${stamp}`, "知网", "电子刊", "普通", "教育", "渠道E", "吴老师", "800-1000", 1500, "CNY"],
  [`批量期刊F-${stamp}`, "", "知网", "电子刊", "普通", "人文", "渠道F", "郑老师", 100, 200, "CNY"],
  [`批量期刊G-${stamp}`, `批量出版社G-${stamp}`, "万方", "纸质刊", "普通", "艺术", "渠道G", "冯老师", 200, 300, "CNY"],
];

const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([headers, ...rows]), "期刊数据");
const file = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
const fd = new FormData();
fd.append("file", new Blob([file], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), `批量测试-${stamp}.xlsx`);

console.log("=== PREVIEW ===");
const pvRes = await fetch(`${BASE}/api/v1/admin/journals/import/preview`, {
  method: "POST",
  headers: { Cookie: cookie },
  body: fd,
});
const pv = await pvRes.json();
console.log("preview status", pvRes.status);
if (pvRes.ok) {
  const d = pv.data;
  console.log("sheets", d.sheets.map((s) => ({ name: s.name, cols: s.columns.map((c) => `${c.column}=${c.target}`) })));
  console.log("totalRows", d.totalRows, "okRows", d.okRows, "duplicateRows", d.duplicateRows, "errorRows", d.errorRows);
  console.log("totalGroups", d.totalGroups, "newGroups", d.newGroups, "duplicateGroups", d.duplicateGroups, "errorGroups", d.errorGroups);
  console.log("newDictValues", JSON.stringify(d.newDictValues));
  console.log("rowErrors", JSON.stringify(d.rowErrors));
  const okGroups = d.groups.filter((g) => g.status === "OK");
  const multi = okGroups.find((g) => g.sources.length > 1);
  console.log("multi-channel group", multi ? { title: multi.title, sources: multi.sources.map((s) => s.sourceName) } : null);

  console.log("=== CONFIRM (CREATE all OK groups) ===");
  const decisions = okGroups.map((g) => ({ key: g.key, action: "CREATE" }));
  const fd2 = new FormData();
  fd2.append("file", new Blob([file], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), `批量测试-${stamp}.xlsx`);
  fd2.append("status", "PENDING");
  fd2.append("decisions", JSON.stringify(decisions));
  const cfRes = await fetch(`${BASE}/api/v1/admin/journals/import/confirm`, {
    method: "POST",
    headers: { Cookie: cookie },
    body: fd2,
  });
  console.log("confirm status", cfRes.status);
  console.log("confirm body", (await cfRes.text()).slice(0, 3000));
}
