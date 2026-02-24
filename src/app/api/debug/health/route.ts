import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/db";
import pg from "pg";

const DEPLOY_MARKER = "562808b-ssl-fix";

export async function GET() {
  const result: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
    deployMarker: DEPLOY_MARKER,
  };

  // 1. Check environment variables
  const dbUrl = process.env.DATABASE_URL ?? "";
  result.env = {
    hasDbUrl: !!process.env.DATABASE_URL,
    dbUrlPreview: dbUrl ? dbUrl.replace(/:[^@]+@/, ":***@").substring(0, 80) + "..." : "NOT SET",
    hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    hasSupabaseKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    nodeEnv: process.env.NODE_ENV,
  };

  // 2. Test auth
  try {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    result.auth = {
      hasUser: !!user,
      userId: user?.id ?? null,
      email: user?.email ?? null,
      metadataName: user?.user_metadata?.name ?? null,
      error: error?.message ?? null,
    };
  } catch (e) {
    result.auth = {
      hasUser: false,
      error: e instanceof Error ? e.message : String(e),
    };
  }

  // 3. Test DB connection directly (bypass Prisma)
  try {
    const pool = new pg.Pool({
      connectionString: process.env.DATABASE_URL,
      max: 1,
      connectionTimeoutMillis: 5000,
      ssl: { rejectUnauthorized: false },
    });
    const start = Date.now();
    const res = await pool.query("SELECT 1 as ok");
    const latency = Date.now() - start;
    await pool.end();
    result.dbDirect = {
      connected: true,
      latency: `${latency}ms`,
      result: res.rows[0],
    };
  } catch (e) {
    result.dbDirect = {
      connected: false,
      error: e instanceof Error ? e.message : String(e),
    };
  }

  // 4. Test Prisma connection
  try {
    const start = Date.now();
    const count = await prisma.profile.count();
    const latency = Date.now() - start;
    result.dbPrisma = {
      connected: true,
      latency: `${latency}ms`,
      profileCount: count,
    };
  } catch (e) {
    result.dbPrisma = {
      connected: false,
      error: e instanceof Error ? e.message : String(e),
    };
  }

  // 5. Try to find profile for authenticated user
  try {
    const authData = result.auth as Record<string, unknown>;
    if (authData?.hasUser && authData?.userId) {
      const profile = await prisma.profile.findUnique({
        where: { id: authData.userId as string },
      });
      result.profile = profile
        ? {
            found: true,
            id: profile.id,
            email: profile.email,
            name: profile.name,
            role: profile.role,
            isActive: profile.isActive,
          }
        : { found: false, reason: "No profile with this auth user ID" };
    } else {
      result.profile = { found: false, reason: "No authenticated user to look up" };
    }
  } catch (e) {
    result.profile = {
      found: false,
      error: e instanceof Error ? e.message : String(e),
    };
  }

  // 6. List all profiles (for debugging)
  try {
    const allProfiles = await prisma.profile.findMany({
      select: { id: true, email: true, name: true, role: true },
      take: 10,
    });
    result.allProfiles = allProfiles;
  } catch (e) {
    result.allProfiles = { error: e instanceof Error ? e.message : String(e) };
  }

  return NextResponse.json(result, {
    headers: { "Cache-Control": "no-store" },
  });
}
