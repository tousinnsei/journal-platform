# 期刊信息数据库与检索平台 (journal-platform)

期刊 / 软著 / 专利 / 商标资源的信息管理与展示平台，基于 **Next.js 16 (App Router) + Prisma + PostgreSQL**。

- 前台：期刊目录、期刊详情、软著 / 专利 / 商标资源列表与详情
- 后台（`/admin`）：登录、仪表盘、期刊/出版社/字典 CRUD、Excel 批量导入、软著 / 专利 / 商标管理
- 认证：JWT (HS256) + HttpOnly Cookie（`journal_admin_token`），仅管理员可用

## 技术栈

| 组件 | 版本 | 说明 |
| --- | --- | --- |
| Next.js | 16.3.0 | App Router + Turbopack，`proxy.ts` 守卫 `/admin/*` |
| React | 19.2.8 | — |
| Prisma | 6.19.3 | ORM，迁移 + 客户端生成 |
| PostgreSQL | — | 生产数据库（Prisma Postgres，`sslmode=require`） |
| bcryptjs / jsonwebtoken | — | 密码哈希与登录令牌 |
| xlsx / zod | — | Excel 导入解析 / 参数校验 |

## 环境变量

复制 `.env.example` 为 `.env` 并填写（`DATABASE_URL` 必须指向 PostgreSQL）：

| 变量 | 必填 | 说明 |
| --- | --- | --- |
| `DATABASE_URL` | 是 | PostgreSQL 连接串（生产必须为 `postgresql://...`，禁止 SQLite `file:`） |
| `JWT_SECRET` | 是 | 强随机密钥，生产环境必须与开发默认值不同，否则登录接口会拒绝签发令牌 |
| `NEXT_PUBLIC_APP_URL` | 否 | 站点公开地址（当前代码未使用） |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | 否 | `db:seed` 使用的管理员账号（生产环境缺 `ADMIN_PASSWORD` 时 seed 会报错） |
| `EDITOR_EMAIL` / `EDITOR_PASSWORD` | 否 | `db:seed` 使用的编辑员账号 |

## 本地开发

```bash
npm install          # 自动执行 prisma generate
npx prisma migrate deploy   # 应用数据库迁移（建表）
npm run db:seed      # 可选：写入初始数据（用户/出版社/示例期刊等）
npm run dev          # 启动开发服务器 http://localhost:3000
```

## 数据迁移（SQLite → PostgreSQL）

本地历史数据在 `prisma/dev.db`（SQLite，已被 Git 忽略）。迁移到云端 PostgreSQL 使用：

```bash
npx tsx scripts/migrate-sqlite-to-postgres.mjs
```

脚本会按依赖顺序把全部 22 张表（用户、出版社、期刊、字典、软著、专利、商标、审计日志等）迁入
`DATABASE_URL` 指向的 PostgreSQL，保留原始 UUID 主键，并自动为 enum / timestamp 列添加类型转换，
重复运行会跳过已迁移的表。

## 构建与生产

```bash
npm run build        # 生产构建
npm run start        # 本地运行生产构建（默认 :3000）
```

## 部署到 Vercel

1. 在 Vercel 导入本仓库（或直接 `vercel` CLI 部署）。
2. 在 Vercel 项目环境变量中配置 `DATABASE_URL`（PostgreSQL 连接串）与 `JWT_SECRET`（强随机值）。
   `vercel-build` 会自动执行 `prisma generate && prisma migrate deploy && next build`，
   因此数据库迁移会随每次部署自动应用。
3. 首次访问 `/admin` 前需先保证 `users` 表中存在管理员账号（迁移自 SQLite 或执行 seed）。

> 注意：部署后请勿使用默认/公开的 `JWT_SECRET` 与公开密码，务必在 Vercel 中设置为强随机值。

## 常用脚本

| 命令 | 说明 |
| --- | --- |
| `npm run db:migrate` | Prisma 迁移开发（`migrate dev`） |
| `npm run db:deploy` | 应用已生成迁移（`migrate deploy`） |
| `npm run db:status` | 检查迁移状态 |
| `npm run db:generate` | 重新生成 Prisma Client |
| `npm run lint` | ESLint 检查 |
| `npm run test` | 运行 `scripts/test.ts` |
