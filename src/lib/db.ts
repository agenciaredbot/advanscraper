import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const connectionString = process.env.DATABASE_URL!;

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  const pool = new pg.Pool({ connectionString });
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

// Helper: Find or create a user profile (handles missing trigger scenarios)
const ADMIN_EMAILS = ["agenciaredbot@gmail.com"];

export async function getOrCreateProfile(userId: string, email: string, name?: string) {
  let profile = await prisma.profile.findUnique({ where: { id: userId } });

  if (!profile) {
    profile = await prisma.profile.upsert({
      where: { id: userId },
      update: {},
      create: {
        id: userId,
        email,
        name: name ?? "",
        role: ADMIN_EMAILS.includes(email) ? "superadmin" : "user",
        isActive: true,
        dailyLimit: 50,
      },
    });
  }

  return profile;
}
