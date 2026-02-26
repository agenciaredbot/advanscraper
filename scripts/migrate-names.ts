import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter } as any);

async function migrate() {
  const leads = await prisma.lead.findMany({
    where: { contactPerson: { not: null } },
    select: { id: true, contactPerson: true },
  });

  console.log("Found", leads.length, "leads with contactPerson");

  let updated = 0;
  for (const lead of leads) {
    if (lead.contactPerson === null) continue;
    const parts = lead.contactPerson.trim().split(/\s+/);
    const firstName = parts[0] || null;
    const lastName = parts.length > 1 ? parts.slice(1).join(" ") : null;

    await prisma.lead.update({
      where: { id: lead.id },
      data: { firstName, lastName },
    });
    updated++;
  }

  console.log("Updated", updated, "leads with firstName/lastName");
  await prisma.$disconnect();
  await pool.end();
}

migrate().catch(console.error);
