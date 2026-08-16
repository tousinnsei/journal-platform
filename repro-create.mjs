const BASE = "http://localhost:3000";
const stamp = Date.now();

const login = await fetch(`${BASE}/api/v1/auth/login`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ email: "admin@journal.org", password: "admin123456" }),
});
const cookie = (login.headers.get("set-cookie") || "").split(";")[0];
console.log("login", login.status);

const payload = {
  title: `手动新增期刊-${stamp}`,
  publisherName: `手动出版社-${stamp}`,
  description: "测试描述",
  level: "CORE",
  status: "PENDING",
  indexing: ["知网"],
  formats: ["电子刊"],
  coreTypes: ["北大核心"],
  fields: ["计算机"],
  sources: [
    {
      sourceName: "测试渠道",
      contactName: "张老师",
      contactNickname: "小张",
      contactPhone: "13800000000",
      contactWechat: "zhang001",
      contactEmail: "zhang@example.com",
      costPrice: 500,
      salePrice: 800,
      currency: "CNY",
      status: "ACTIVE",
    },
  ],
};

console.log("=== POST /api/v1/admin/journals ===");
const res = await fetch(`${BASE}/api/v1/admin/journals`, {
  method: "POST",
  headers: { "Content-Type": "application/json", Cookie: cookie },
  body: JSON.stringify(payload),
});
console.log("status", res.status);
console.log("body", await res.text());
