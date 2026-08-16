import { PrismaClient } from "@prisma/client";

const p = new PrismaClient();

async function main() {
  const pubs = await p.publisher.count();
  const js = await p.journal.count();
  const orphanJ = await p.$queryRawUnsafe<{ n: number }[]>(
    "SELECT COUNT(*) AS n FROM journals j LEFT JOIN publishers p ON j.publisherId = p.id WHERE p.id IS NULL"
  );
  const orphanP = await p.publisher.count({ where: { journals: { none: {} } } });
  console.log("publishers:", pubs);
  console.log("journals:", js);
  console.log("journals with missing publisher:", orphanJ);
  console.log("publishers with zero journals:", orphanP);

  const sample = await p.publisher.findMany({ take: 10, select: { id: true, name: true, slug: true } });
  console.log("sample publishers:", JSON.stringify(sample, null, 2));

  const journalSample = await p.journal.findMany({
    take: 3,
    select: { id: true, title: true, publisherId: true, publisher: { select: { id: true, name: true } } },
  });
  console.log("sample journals:", JSON.stringify(journalSample, null, 2));

  const dupNames = await p.publisher.groupBy({
    by: ["name"],
    _count: { name: true },
    having: { name: { _count: { gt: 1 } } },
  });
  console.log("duplicate publisher names:", JSON.stringify(dupNames));

  const users = await p.user.findMany({ select: { id: true, email: true, role: true } });
  console.log("users:", JSON.stringify(users));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => p.$disconnect());
