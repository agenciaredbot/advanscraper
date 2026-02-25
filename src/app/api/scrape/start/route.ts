import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma, getOrCreateProfile } from "@/lib/db";
import { resolveApiKey, SYSTEM_KEY_NAMES } from "@/lib/api-keys";
import { startActorAsync, getActorConfig } from "@/lib/scrapers/apify";

export const maxDuration = 15;

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const body = await request.json();
    const { source, query, location, maxResults = 50, usernames, pageUrls } = body;

    if (!source || !query) {
      return NextResponse.json(
        { error: "Campos 'source' y 'query' son obligatorios" },
        { status: 400 }
      );
    }

    // Check daily limit
    const profile = await getOrCreateProfile(user.id, user.email ?? "");

    const todaySearches = await prisma.search.count({
      where: {
        userId: user.id,
        createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
      },
    });

    const maxDaily = parseInt(process.env.MAX_DAILY_SCRAPES || "100", 10);
    if (todaySearches >= maxDaily) {
      return NextResponse.json(
        { error: `Límite diario alcanzado (${maxDaily} búsquedas)` },
        { status: 429 }
      );
    }

    // Resolve Apify token
    const apiToken = await resolveApiKey(SYSTEM_KEY_NAMES.APIFY_API_TOKEN, profile.apifyApiToken);
    if (!apiToken) {
      return NextResponse.json(
        { error: "Configura tu API token de Apify en Settings o contacta al administrador" },
        { status: 400 }
      );
    }

    // Get actor config for this source
    const { actorId, input } = getActorConfig(source, {
      query,
      location,
      maxResults,
      usernames,
      pageUrls,
    });

    // Start actor async (returns immediately, ~1-2s)
    const runInfo = await startActorAsync(actorId, input, apiToken);

    // Create search record with Apify run tracking
    const search = await prisma.search.create({
      data: {
        userId: user.id,
        source,
        query,
        location: location || null,
        filters: JSON.stringify({ provider: "apify", maxResults }),
        status: "running",
        apifyRunId: runInfo.runId,
        apifyActorId: actorId,
        apifyPhase: "scraping",
      },
    });

    return NextResponse.json({
      success: true,
      searchId: search.id,
      status: "running",
      message: "Búsqueda iniciada. Monitoreando progreso...",
    });
  } catch (error) {
    console.error("[scrape/start] Error:", error);
    const msg = error instanceof Error ? error.message : "Error interno";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
