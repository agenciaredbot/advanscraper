import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/db";
import {
  createJob,
  updateJobStatus,
  updateJobProgress,
  setJobResult,
  setJobError,
} from "@/lib/jobs/manager";
import {
  scrapeLinkedInRemote,
  checkPlaywrightService,
} from "@/lib/scrapers/playwright-service";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const body = await request.json();
    const { keyword, location, maxResults = 20 } = body;

    if (!keyword) {
      return NextResponse.json(
        { error: "El campo 'keyword' es obligatorio" },
        { status: 400 }
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
        source: "linkedin",
        query: keyword,
        location: location || null,
        filters: JSON.stringify({ maxResults }),
        status: "running",
      },
    });

    const jobId = createJob(user.id, "linkedin_scrape");

    // Start scraping in background via microservice
    (async () => {
      try {
        updateJobStatus(jobId, "running");
        updateJobProgress(jobId, {
          phase: "Scrapeando LinkedIn",
          current: 0,
          total: maxResults,
          message: "Enviando solicitud al servicio de scraping...",
        });

        const results = await scrapeLinkedInRemote({
          keyword,
          location,
          maxResults: Math.min(maxResults, 50),
        });

        // Save results to DB
        let savedCount = 0;
        for (const data of results) {
          try {
            await prisma.lead.create({
              data: {
                userId: user.id,
                searchId: search.id,
                source: "linkedin",
                contactPerson: data.contactPerson,
                contactTitle: data.contactTitle,
                city: data.city || location || null,
                profileUrl: data.profileUrl,
                businessName: data.company,
              },
            });
            savedCount++;
          } catch {
            // Duplicate or DB error
          }
          updateJobProgress(jobId, {
            current: savedCount,
            message: `Guardando perfil ${savedCount} de ${results.length}...`,
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
          message: `¡${savedCount} perfiles encontrados!`,
        });
        setJobResult(jobId, { count: savedCount, results });
      } catch (error) {
        const errorMsg =
          error instanceof Error ? error.message : "Unknown error";
        console.error("Background LinkedIn scrape error:", errorMsg);

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
    });
  } catch (error) {
    console.error("LinkedIn scrape endpoint error:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
