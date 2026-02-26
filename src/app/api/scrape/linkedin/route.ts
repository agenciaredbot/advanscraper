import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/db";
import {
  scrapeLinkedInRemote,
  checkPlaywrightService,
} from "@/lib/scrapers/playwright-service";

export const maxDuration = 60;

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
            "Servicio de scraping no disponible. Verifica que el microservicio Playwright esté corriendo.",
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

    try {
      const results = await scrapeLinkedInRemote({
        keyword,
        location,
        maxResults: Math.min(maxResults, 50),
      });

      // Save results to DB (bulk insert, skip duplicates)
      const validResults = results.filter((r) => r.profileUrl);
      const result = await prisma.lead.createMany({
        data: validResults.map((data) => {
          const parts = data.contactPerson ? data.contactPerson.trim().split(/\s+/) : [];
          return {
            userId: user.id,
            searchId: search.id,
            source: "linkedin",
            contactPerson: data.contactPerson,
            firstName: data.firstName || parts[0] || null,
            lastName: data.lastName || (parts.length > 1 ? parts.slice(1).join(" ") : null),
            contactTitle: data.contactTitle,
            city: data.city || location || null,
            profileUrl: data.profileUrl,
            businessName: data.company,
            linkedinUrl: data.profileUrl,
            googleMapsUrl: null,
            state: null,
            industry: null,
          };
        }),
        skipDuplicates: true,
      });
      const savedCount = result.count;

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
        message: `¡${savedCount} perfiles encontrados!`,
      });
    } catch (error) {
      const errorMsg =
        error instanceof Error ? error.message : "Error desconocido";

      await prisma.search
        .update({
          where: { id: search.id },
          data: { status: "failed", errorMessage: errorMsg },
        })
        .catch(() => {});

      return NextResponse.json(
        { error: `Error en scraping: ${errorMsg}` },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("LinkedIn scrape endpoint error:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
