import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/db";
import { createJob } from "@/lib/jobs/manager";
import { scrapeGoogleMaps } from "@/lib/scrapers/google-maps";

export async function POST(request: NextRequest) {
  try {
    // Auth check
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    // Parse request body
    const body = await request.json();
    const { query, location, maxResults = 20, extractEmails = true } = body;

    if (!query) {
      return NextResponse.json(
        { error: "El campo 'query' es obligatorio" },
        { status: 400 }
      );
    }

    // Check daily limit
    const profile = await prisma.profile.findUnique({
      where: { id: user.id },
    });

    if (!profile) {
      return NextResponse.json(
        { error: "Perfil no encontrado" },
        { status: 404 }
      );
    }

    const todaySearches = await prisma.search.count({
      where: {
        userId: user.id,
        createdAt: {
          gte: new Date(new Date().setHours(0, 0, 0, 0)),
        },
      },
    });

    const maxDaily = parseInt(process.env.MAX_DAILY_SCRAPES || "100", 10);
    if (todaySearches >= maxDaily) {
      return NextResponse.json(
        { error: `Límite diario alcanzado (${maxDaily} búsquedas)` },
        { status: 429 }
      );
    }

    // Create search record
    const search = await prisma.search.create({
      data: {
        userId: user.id,
        source: "google_maps",
        query,
        location: location || null,
        filters: JSON.stringify({ maxResults, extractEmails }),
        status: "running",
      },
    });

    // Create job for tracking
    const jobId = createJob(user.id, "google_maps_scrape");

    // Start scraping in background (don't await)
    scrapeGoogleMaps({
      query,
      location,
      maxResults: Math.min(maxResults, 80), // Cap at 80 per session
      extractEmails,
      jobId,
      userId: user.id,
      searchId: search.id,
    }).catch((err) => {
      console.error("Background scrape error:", err);
    });

    return NextResponse.json({
      success: true,
      jobId,
      searchId: search.id,
      message: "Búsqueda iniciada. Consulta el progreso con /api/jobs/{jobId}",
    });
  } catch (error) {
    console.error("Scrape endpoint error:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
