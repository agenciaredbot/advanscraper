import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma, getOrCreateProfile } from "@/lib/db";
import {
  scrapeGoogleMapsRemote,
  checkPlaywrightService,
} from "@/lib/scrapers/playwright-service";

export const maxDuration = 60; // Vercel hobby max

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
    const { query, location, maxResults = 10, extractEmails = false } = body;

    if (!query) {
      return NextResponse.json(
        { error: "El campo 'query' es obligatorio" },
        { status: 400 }
      );
    }

    // Check daily limit
    await getOrCreateProfile(user.id, user.email ?? "");

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
            "Servicio de scraping no disponible. Verifica que el microservicio Playwright esté corriendo.",
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

    // Execute scraping synchronously (wait for results)
    try {
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
          // Duplicate or DB error — skip
        }
      }

      await prisma.search.update({
        where: { id: search.id },
        data: {
          status: "completed",
          totalResults: savedCount,
          completedAt: new Date(),
        },
      });

      return NextResponse.json({
        success: true,
        searchId: search.id,
        count: savedCount,
        message: `¡${savedCount} leads encontrados!`,
      });
    } catch (error) {
      const rawMsg =
        error instanceof Error ? error.message : "Error desconocido";

      await prisma.search
        .update({
          where: { id: search.id },
          data: { status: "failed", errorMessage: rawMsg },
        })
        .catch(() => {});

      // Translate technical errors to user-friendly messages
      let userMsg = rawMsg;
      const lower = rawMsg.toLowerCase();
      if (lower.includes("unusual traffic") || lower.includes("tráfico inusual") || lower.includes("detectó")) {
        userMsg = "Google detectó automatización. Espera unos minutos e intenta de nuevo.";
      } else if (lower.includes("captcha") || lower.includes("bloqueó")) {
        userMsg = "Google bloqueó la solicitud. Espera unos minutos e intenta de nuevo.";
      } else if (lower.includes("timeout") || lower.includes("tardó")) {
        userMsg = "La búsqueda tardó demasiado. Intenta con menos resultados o una búsqueda más específica.";
      } else if (lower.includes("not available") || lower.includes("no disponible")) {
        userMsg = "El servicio de scraping no está disponible. Verifica que esté corriendo.";
      } else if (lower.includes("no se encontraron resultados")) {
        userMsg = rawMsg; // Already user-friendly
      }

      return NextResponse.json(
        { error: userMsg },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Scrape endpoint error:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
