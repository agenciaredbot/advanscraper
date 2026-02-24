import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma, getOrCreateProfile } from "@/lib/db";
import {
  createJob,
  updateJobStatus,
  updateJobProgress,
  setJobResult,
  setJobError,
} from "@/lib/jobs/manager";
import {
  scrapeGoogleMapsRemote,
  checkPlaywrightService,
} from "@/lib/scrapers/playwright-service";

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
    const profile = await getOrCreateProfile(user.id, user.email ?? "");

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

    // Check if Playwright service is available
    const serviceOnline = await checkPlaywrightService();
    if (!serviceOnline) {
      return NextResponse.json(
        {
          error:
            "Servicio de scraping no disponible. Intenta de nuevo en unos segundos.",
        },
        { status: 503 }
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

    // Start scraping in background via microservice
    (async () => {
      try {
        updateJobStatus(jobId, "running");
        updateJobProgress(jobId, {
          phase: "Scrapeando Google Maps",
          current: 0,
          total: maxResults,
          message: "Enviando solicitud al servicio de scraping...",
        });

        const results = await scrapeGoogleMapsRemote({
          query,
          location,
          maxResults: Math.min(maxResults, 80),
          extractEmails,
        });

        // Save results to DB
        let savedCount = 0;
        for (const data of results) {
          try {
            await prisma.lead.create({
              data: {
                userId: user.id,
                searchId: search.id,
                source: "google_maps",
                businessName: data.businessName,
                category: data.category,
                address: data.address,
                city: data.city || location || null,
                phone: data.phone,
                website: data.website,
                email: data.email,
                rating: data.rating,
                reviewsCount: data.reviewsCount,
                profileUrl: data.profileUrl,
              },
            });
            savedCount++;
          } catch {
            // Duplicate or DB error
          }
          updateJobProgress(jobId, {
            current: savedCount,
            message: `Guardando resultado ${savedCount} de ${results.length}...`,
          });
        }

        await prisma.search.update({
          where: { id: search.id },
          data: {
            status: "completed",
            totalResults: savedCount,
            completedAt: new Date(),
          },
        });

        updateJobStatus(jobId, "completed");
        updateJobProgress(jobId, {
          phase: "Completado",
          current: savedCount,
          total: savedCount,
          message: `¡Listo! ${savedCount} leads guardados.`,
        });
        setJobResult(jobId, { count: savedCount, results });
      } catch (error) {
        const errorMsg =
          error instanceof Error ? error.message : "Unknown error";
        console.error("Background Google Maps scrape error:", errorMsg);

        await prisma.search
          .update({
            where: { id: search.id },
            data: { status: "failed", errorMessage: errorMsg },
          })
          .catch(() => {});

        setJobError(jobId, errorMsg);
      }
    })();

    return NextResponse.json({
      success: true,
      jobId,
      searchId: search.id,
      message:
        "Búsqueda iniciada. Consulta el progreso con /api/jobs/{jobId}",
    });
  } catch (error) {
    console.error("Scrape endpoint error:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
