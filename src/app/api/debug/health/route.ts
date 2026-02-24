import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/db";
import pg from "pg";

const DEPLOY_MARKER = "direct-conn-bypass-supavisor";

export async function GET() {
  const result: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
    deployMarker: DEPLOY_MARKER,
  };

  // 1. Parse and show DATABASE_URL details (no password)
  const dbUrl = process.env.DATABASE_URL ?? "";
  let parsedUrl: { username: string; hostname: string; port: string; pathname: string; search: string } | null = null;
  try {
    const u = new URL(dbUrl);
    parsedUrl = {
      username: u.username,
      hostname: u.hostname,
      port: u.port,
      pathname: u.pathname,
      search: u.search,
    };
  } catch {
    parsedUrl = null;
  }

  result.env = {
    hasDbUrl: !!dbUrl,
    parsedUrl,
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
    result.auth = { hasUser: false, error: e instanceof Error ? e.message : String(e) };
  }

  // 3. Test DB with ssl: true (SNI auto from hostname)
  result.dbSslTrue = await testPool(dbUrl, { ssl: true }, "ssl:true");

  // 4. Test DB with ssl: { rejectUnauthorized: false } (old method)
  result.dbSslObject = await testPool(dbUrl, { ssl: { rejectUnauthorized: false } }, "ssl:{rejectUnauthorized:false}");

  // 5. Test DB with ssl + explicit servername
  const hostname = parsedUrl?.hostname ?? "";
  result.dbSslServername = await testPool(
    dbUrl,
    { ssl: { rejectUnauthorized: false, servername: hostname } },
    `ssl:{servername:'${hostname}'}`
  );

  // 6. Test DB WITHOUT ssl (in case Supavisor doesn't require it)
  result.dbNoSsl = await testPool(dbUrl, {}, "no-ssl");

  // 6b. Test TRUE direct connection (bypass Supavisor entirely)
  const username = parsedUrl?.username ?? "";
  const projectRef = username.startsWith("postgres.") ? username.slice("postgres.".length) : "";
  result.projectRef = projectRef;

  if (projectRef) {
    try {
      const directUrl = new URL(dbUrl);
      directUrl.hostname = `db.${projectRef}.supabase.co`;
      directUrl.port = "5432";
      directUrl.username = "postgres";
      directUrl.search = "";
      result.dbDirectConnection = await testPool(
        directUrl.toString(),
        { ssl: { rejectUnauthorized: false } },
        `direct:db.${projectRef}.supabase.co:5432 (user=postgres)`
      );
    } catch (e) {
      result.dbDirectConnection = { connected: false, error: e instanceof Error ? e.message : String(e) };
    }

    // 6c. Test session-mode pooler (same pooler host, port 5432 instead of 6543)
    try {
      const sessionUrl = new URL(dbUrl);
      sessionUrl.port = "5432";
      sessionUrl.search = "";
      result.dbSessionPooler = await testPool(
        sessionUrl.toString(),
        { ssl: { rejectUnauthorized: false } },
        `session-pooler:${parsedUrl?.hostname}:5432`
      );
    } catch (e) {
      result.dbSessionPooler = { connected: false, error: e instanceof Error ? e.message : String(e) };
    }
  }

  // 7. Test Prisma (now uses direct connection from db.ts)
  try {
    const start = Date.now();
    const count = await prisma.profile.count();
    const latency = Date.now() - start;
    result.dbPrisma = { connected: true, latency: `${latency}ms`, profileCount: count };
  } catch (e) {
    result.dbPrisma = { connected: false, error: e instanceof Error ? e.message : String(e) };
  }

  // 8. Profile lookup (only if Prisma connected)
  try {
    const authData = result.auth as Record<string, unknown>;
    if (authData?.hasUser && authData?.userId) {
      const profile = await prisma.profile.findUnique({
        where: { id: authData.userId as string },
      });
      result.profile = profile
        ? { found: true, id: profile.id, email: profile.email, name: profile.name, role: profile.role }
        : { found: false, reason: "No profile with this auth user ID" };
    } else {
      result.profile = { found: false, reason: "No authenticated user" };
    }
  } catch (e) {
    result.profile = { found: false, error: e instanceof Error ? e.message : String(e) };
  }

  return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
}

// Helper: test a pg.Pool connection with given SSL config
async function testPool(
  connectionString: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sslConfig: Record<string, any>,
  label: string
) {
  try {
    const poolOpts: pg.PoolConfig = {
      connectionString,
      max: 1,
      idleTimeoutMillis: 5000,
      connectionTimeoutMillis: 5000,
      ...sslConfig,
    };
    const pool = new pg.Pool(poolOpts);
    const start = Date.now();
    const res = await pool.query("SELECT 1 as ok");
    const latency = Date.now() - start;
    await pool.end();
    return { connected: true, latency: `${latency}ms`, label, result: res.rows[0] };
  } catch (e) {
    return { connected: false, label, error: e instanceof Error ? e.message : String(e) };
  }
}
