import { PrismaClient, JournalStatus, ResourceStatus } from "@prisma/client";

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
  console.log("Journal Platform smoke tests\n");

  console.log("Journals");
  const journals = await prisma.journal.findMany({
    where: { status: JournalStatus.PUBLISHED },
    include: { sources: true },
  });
  check("at least 3 published journals", journals.length >= 3, `(found ${journals.length})`);
  check("every published journal has a sale price", journals.every((j) => j.minSalePrice != null));
  check(
    "minSalePrice equals min of ACTIVE source sale prices",
    journals.every((j) => {
      const active = j.sources.filter((s) => s.status === "ACTIVE" && s.salePrice != null);
      if (active.length === 0) return j.minSalePrice == null;
      const min = Math.min(...active.map((s) => s.salePrice));
      return j.minSalePrice === min;
    })
  );
  const multiChannel = journals.filter((j) => j.sources.length >= 2).length;
  check("at least one journal has 2+ channels", multiChannel >= 1, `(found ${multiChannel})`);

  console.log("\nSoftware copyrights");
  const copyrights = await prisma.softwareCopyright.findMany({
    where: { status: ResourceStatus.PUBLISHED },
    include: { sources: true },
  });
  check("at least 2 published copyrights", copyrights.length >= 2, `(found ${copyrights.length})`);
  check(
    "every copyright has registration number and owner",
    copyrights.every((c) => c.registrationNo != null && c.copyrightOwner != null)
  );

  console.log("\nPatents");
  const patents = await prisma.patent.findMany({
    where: { status: ResourceStatus.PUBLISHED },
    include: { sources: true },
  });
  check("at least 2 published patents", patents.length >= 2, `(found ${patents.length})`);
  check("every patent has at least one channel", patents.every((p) => p.sources.length >= 1));

  console.log("\nTrademark services");
  const trademarks = await prisma.trademarkService.findMany({
    where: { status: ResourceStatus.PUBLISHED },
    include: { sources: true },
  });
  check("at least 2 published trademark services", trademarks.length >= 2, `(found ${trademarks.length})`);
  check("every trademark channel records 对接次数 (times)", trademarks.every((t) => t.sources.every((s) => s.times >= 1)));

  console.log("\nCost-price isolation (internal invariants)");
  check(
    "minSalePrice never below minCostPrice",
    [...journals, ...copyrights, ...patents, ...trademarks].every((r) =>
      r.minCostPrice == null || r.minSalePrice == null ? true : r.minSalePrice! >= r.minCostPrice!
    )
  );

  await prisma.$disconnect();

  if (failures > 0) {
    console.log(`\n${failures} check(s) FAILED`);
    process.exit(1);
  }
  console.log("\nAll checks passed");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
