const BASE = "http://localhost:3000";

const loginRes = await fetch(`${BASE}/api/v1/auth/login`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ email: "admin@journal.org", password: "admin123456" }),
});
const cookie = (loginRes.headers.get("set-cookie") || "").split(";")[0];
console.log("cookie?", Boolean(cookie));

const list = async (path) => {
  const r = await fetch(`${BASE}/api/v1/admin/${path}`, { headers: { Cookie: cookie } });
  const b = await r.json();
  return r.status === 200 ? b.data : b;
};

const indexing = await list("indexing-databases");
const formats = await list("journal-formats");
const indexes = await list("journal-indexes");
const fields = await list("fields");
console.log("indexing", indexing.map((x) => x.name));
console.log("formats", formats.map((x) => x.name));
console.log("indexes", indexes.map((x) => x.name));
console.log("fields", fields.map((x) => x.name));

const name = (arr, n) => arr.find((x) => x.name === n)?.id;

const stamp = Date.now();
const payload = {
  title: `复现期刊-${stamp}`,
  publisherName: `复现出版社-${stamp}`,
  description: "复现测试",
  level: "ORDINARY",
  status: "DRAFT",
  indexingDatabaseIds: [name(indexing, "知网"), name(indexing, "万方")].filter(Boolean),
  formatIds: [name(formats, "电子刊")].filter(Boolean),
  indexIds: [],
  fieldIds: [name(fields, "计算机")].filter(Boolean),
  sources: [
    { sourceName: "渠道甲", contactName: "张老师", costPrice: 500, salePrice: 800, currency: "CNY", status: "ACTIVE" },
    { sourceName: "渠道乙", contactName: "李老师", costPrice: 600, salePrice: 900, currency: "CNY", status: "ACTIVE" },
  ],
};
console.log("payload", JSON.stringify(payload, null, 1));

const res = await fetch(`${BASE}/api/v1/admin/journals`, {
  method: "POST",
  headers: { "Content-Type": "application/json", Cookie: cookie },
  body: JSON.stringify(payload),
});
console.log("status", res.status);
console.log("body", await res.text());
