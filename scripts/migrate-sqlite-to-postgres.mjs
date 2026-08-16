import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";
import { Prisma, PrismaClient } from "@prisma/client";

const ROOT = "D:/AIProjects/newGit/journal-platform";
const SQLITE_PATH = path.join(ROOT, "prisma", "dev.db");

// ---- load DATABASE_URL from .env (without printing it) ----
const envText = fs.readFileSync(path.join(ROOT, ".env"), "utf8");
const dbUrl = (envText.match(/^DATABASE_URL=(.*)$/m) ?? [])[1];
if (!dbUrl || !dbUrl.startsWith("postgres")) {
  console.error("DATABASE_URL missing or not postgres in .env");
  process.exit(1);
}

// ---- tables in dependency order (FK parents first) ----
const TABLES = [
  "users",
  "publishers",
  "categories",
  "indexing_databases",
  "journal_formats",
  "journal_indexes",
  "fields",
  "journals",
  "journal_categories",
  "journal_indexings",
  "journal_format_links",
  "journal_index_links",
  "journal_fields",
  "journal_sources",
  "software_copyrights",
  "software_copyright_sources",
  "patents",
  "patent_sources",
  "trademark_services",
  "trademark_sources",
  "audit_logs",
  "import_logs",
];

const sqlite = new DatabaseSync(SQLITE_PATH);

function sqliteColumns(table) {
  return sqlite.prepare(`PRAGMA table_info("${table}")`).all().map((r) => r.name);
}

function isDateColumn(col) {
  return /At$/.test(col);
}

function toPgValue(value, col) {
  if (value == null) return null;
  if (isDateColumn(col) && typeof value === "number") {
    return new Date(value).toISOString();
  }
  return value;
}

const prisma = new PrismaClient({ datasources: { db: { url: dbUrl } } });

// Detect enum columns (USER-DEFINED) and timestamp columns so we can CAST values.
async function buildCastMap() {
  const enumCols = await prisma.$queryRawUnsafe(
    `SELECT table_name, column_name, udt_name FROM information_schema.columns WHERE data_type = 'USER-DEFINED'`
  );
  const tsCols = await prisma.$queryRawUnsafe(
    `SELECT table_name, column_name FROM information_schema.columns WHERE data_type = 'timestamp without time zone'`
  );
  const castMap = new Map(); // `${table}.${column}` -> cast expression string
  for (const c of enumCols) castMap.set(`${c.table_name}.${c.column_name}`, `"${c.udt_name}"`);
  for (const c of tsCols) castMap.set(`${c.table_name}.${c.column_name}`, `timestamp`);
  return castMap;
}

function castedValue(value, castType) {
  const v = Prisma.sql`${value}`;
  if (!castType) return v;
  return Prisma.sql`CAST(${v} AS ${Prisma.raw(castType)})`;
}

async function countRows(table) {
  const row = await prisma.$queryRawUnsafe(`SELECT COUNT(*)::int AS c FROM "${table}"`);
  return row[0].c;
}

async function migrateTable(table, castMap) {
  const existing = await countRows(table);
  if (existing > 0) {
    console.log(`[skip] ${table}: already has ${existing} rows`);
    return { table, skipped: true, rows: existing };
  }

  const columns = sqliteColumns(table);
  const stmt = sqlite.prepare(`SELECT ${columns.map((c) => `"${c}"`).join(", ")} FROM "${table}"`);
  const rows = stmt.all();

  if (rows.length === 0) {
    console.log(`[empty] ${table}: 0 rows`);
    return { table, skipped: false, rows: 0 };
  }

  const colList = columns.map((c) => `"${c}"`).join(", ");

  await prisma.$transaction(async (tx) => {
    for (const row of rows) {
      const values = columns.map((c) => {
        const raw = toPgValue(row[c], c);
        const cast = castMap.get(`${table}.${c}`);
        return castedValue(raw, cast);
      });
      const placeholders = Prisma.join(values);
      await tx.$executeRaw(
        Prisma.sql`INSERT INTO ${Prisma.raw(`"${table}"`)} (${Prisma.raw(colList)}) VALUES (${placeholders})`
      );
    }
  });

  const after = await countRows(table);
  console.log(`[ok] ${table}: inserted ${rows.length} (confirmed ${after})`);
  return { table, skipped: false, rows: after };
}

async function main() {
  const castMap = await buildCastMap();
  const summary = [];
  for (const t of TABLES) {
    try {
      summary.push(await migrateTable(t, castMap));
    } catch (e) {
      console.error(`[FAIL] ${t}:`, e.message);
      summary.push({ table: t, error: e.message });
    }
  }
  console.log("\n===== MIGRATION SUMMARY =====");
  for (const s of summary) console.log(JSON.stringify(s));
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error("Fatal:", e);
  await prisma.$disconnect();
  process.exit(1);
});
