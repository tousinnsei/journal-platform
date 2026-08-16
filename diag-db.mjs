import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";
dotenv.config({ path: "./.env" });

const db = new PrismaClient({ log: [] });

const tables = [
  "users", "publishers", "categories", "journals", "journal_categories",
  "journal_indexings", "journal_format_links", "journal_index_links",
  "journal_fields", "indexing_databases", "journal_formats", "journal_indexes",
  "fields", "journal_sources", "software_copyrights", "software_copyright_sources",
  "patents", "patent_sources", "trademark_services", "trademark_sources",
  "audit_logs", "import_logs",
];

try {
  console.log("=== PRAGMA foreign_keys (connection) ===");
  console.log(await db.$queryRawUnsafe("PRAGMA foreign_keys;"));

  console.log("\n=== EXISTING TABLES ===");
  const sqliteMaster = await db.$queryRawUnsafe(
    "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;"
  );
  console.log(sqliteMaster.map((r) => r.name).join(", "));

  console.log("\n=== TABLE COLUMNS (journals) ===");
  console.log(await db.$queryRawUnsafe("PRAGMA table_info('journals');"));

  console.log("\n=== FOREIGN KEY LIST per table ===");
  for (const t of tables) {
    const fks = await db.$queryRawUnsafe(`PRAGMA foreign_key_list('${t}');`);
    if (fks.length > 0) {
      console.log(`\n[${t}]`);
      for (const f of fks) {
        console.log(
          `  ${t}.${f.from}  ->  ${f.table}.${f.to}   (constraint: ${f.id}, onUpdate: ${f.on_update}, onDelete: ${f.on_delete})`
        );
      }
    }
  }

  console.log("\n=== ROW COUNTS ===");
  for (const t of tables) {
    try {
      const r = await db.$queryRawUnsafe(`SELECT COUNT(*) AS c FROM "${t}";`);
      console.log(`  ${t}: ${r[0].c}`);
    } catch {
      console.log(`  ${t}: (no table / error)`);
    }
  }

  console.log("\n=== PRAGMA foreign_key_check ===");
  const fkc = await db.$queryRawUnsafe("PRAGMA foreign_key_check;");
  if (fkc.length === 0) {
    console.log("  (0 rows - no FK violations)");
  } else {
    for (const r of fkc) console.log("  ", r);
  }
} catch (e) {
  console.error("DIAG ERROR:", e);
} finally {
  await db.$disconnect();
}
