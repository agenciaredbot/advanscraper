import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const connectionString = process.env.DATABASE_URL!;

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  const pool = new pg.Pool({
    connectionString,
    max: 1,                        // Serverless: 1 conexión por instancia
    idleTimeoutMillis: 20000,      // Cerrar idle después de 20s
    connectionTimeoutMillis: 5000, // Timeout de conexión 5s
    ssl: { rejectUnauthorized: false }, // SSL requerido por Supabase desde Vercel
  });
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
    // Profile doesn't exist — create it
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
  } else {
    // Profile exists — auto-heal bad data
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fixes: Record<string, any> = {};

    // Fix 1: email missing or empty → sync from auth
    if ((!profile.email || profile.email === "") && email) {
      fixes.email = email;
    }

    // Fix 2: name contains an email address → clear it (user can set their real name)
    if (profile.name && profile.name.includes("@") && !name) {
      fixes.name = "";
    } else if (profile.name && profile.name.includes("@") && name && !name.includes("@")) {
      fixes.name = name;
    }

    // Fix 3: admin email should always have superadmin role
    if (email && ADMIN_EMAILS.includes(email) && profile.role !== "superadmin") {
      fixes.role = "superadmin";
    }

    if (Object.keys(fixes).length > 0) {
      profile = await prisma.profile.update({
        where: { id: userId },
        data: fixes,
      });
    }
  }

  return profile;
}
