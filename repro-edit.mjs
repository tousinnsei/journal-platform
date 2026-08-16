const BASE = "http://localhost:3000";
const stamp = Date.now();

const login = await fetch(`${BASE}/api/v1/auth/login`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ email: "admin@journal.org", password: "admin123456" }),
});
const cookie = (login.headers.get("set-cookie") || "").split(";")[0];

// fetch the first journal
const list = await (await fetch(`${BASE}/api/v1/admin/journals?page=1&limit=5`, { headers: { Cookie: cookie } })).json();
const j = list.data[0];
console.log("target journal:", j.id, j.title, "| pub:", j.publisherId);

// GET detail
const det = await (await fetch(`${BASE}/api/v1/admin/journals/${j.id}`, { headers: { Cookie: cookie } })).json();
const d = det.data;
console.log("detail categories/indexing/formats/indexes/fields counts:",
  d.categories.length, d.indexingDatabases.length, d.formats.length, d.indexes.length, d.fields.length, "| sources:", d.sources.length);

// PUT update (ID-based refs, same as edit page)
const putBody = {
  title: d.title,
  publisherName: d.publisher.name,
  description: d.description || "",
  level: d.level,
  status: d.status,
  indexingDatabaseIds: d.indexingDatabases.map((x) => x.databaseId),
  formatIds: d.formats.map((x) => x.formatId),
  indexIds: d.indexes.map((x) => x.indexId),
  fieldIds: d.fields.map((x) => x.fieldId),
};
const putRes = await fetch(`${BASE}/api/v1/admin/journals/${j.id}`, {
  method: "PUT",
  headers: { "Content-Type": "application/json", Cookie: cookie },
  body: JSON.stringify(putBody),
});
console.log("PUT status:", putRes.status, (await putRes.text()).slice(0, 400));

// POST a new source on that journal
const srcBody = {
  sourceName: `PUT测试渠道-${stamp}`,
  contactName: "测试",
  contactNickname: "测试昵称",
  contactPhone: "13911112222",
  contactWechat: "wxid",
  contactEmail: "t@e.com",
  contactNote: "备注",
  costPrice: 300,
  salePrice: 500,
  currency: "CNY",
  status: "ACTIVE",
  sortOrder: 99,
};
const srcRes = await fetch(`${BASE}/api/v1/admin/journals/${j.id}/sources`, {
  method: "POST",
  headers: { "Content-Type": "application/json", Cookie: cookie },
  body: JSON.stringify(srcBody),
});
const src = await srcRes.json();
console.log("source POST status:", srcRes.status, "| msg:", src.message, "| id:", src.data?.source?.id);

if (srcRes.ok && src.data?.source?.id) {
  // PUT update that source
  const upRes = await fetch(`${BASE}/api/v1/admin/journals/${j.id}/sources/${src.data.source.id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", Cookie: cookie },
    body: JSON.stringify({ ...srcBody, salePrice: 520, contactNote: "更新备注" }),
  });
  const up = await upRes.json();
  console.log("source PUT status:", upRes.status, "| msg:", up.message, "| note:", up.data?.source?.contactNote, "| nickname:", up.data?.source?.contactNickname);
}
