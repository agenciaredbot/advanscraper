import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma, getOrCreateProfile } from "@/lib/db";
import {
  scrapeGoogleMapsApify,
  scrapeLinkedInApify,
  scrapeInstagramApify,
  normalizeGoogleMapsApify,
  normalizeLinkedInApify,
  normalizeInstagramApify,
  type NormalizedLead,
} from "@/lib/scrapers/apify";

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const body = await request.json();
    const { source, query, location, maxResults = 50, usernames } = body;

    if (!source || !query) {
      return NextResponse.json(
        { error: "Campos 'source' y 'query' son obligatorios" },
        { status: 400 }
      );
    }

    // Get user's Apify token
    const profile = await getOrCreateProfile(user.id, user.email ?? "");
    const apiToken = profile.apifyApiToken || process.env.APIFY_API_TOKEN;
    if (!apiToken) {
      return NextResponse.json(
        { error: "Configura tu API token de Apify en Settings" },
        { status: 400 }
      );
    }

    // Create search record
    const search = await prisma.search.create({
      data: {
        userId: user.id,
        source: "apify",
        query: `[${source}] ${query}`,
        location: location || null,
        filters: JSON.stringify({ source, maxResults }),
        status: "running",
      },
    });

    try {
      let normalized: NormalizedLead[] = [];

      switch (source) {
        case "google_maps": {
          const results = await scrapeGoogleMapsApify(query, location, maxResults, apiToken);
          normalized = normalizeGoogleMapsApify(results);
          break;
        }
        case "linkedin": {
          const results = await scrapeLinkedInApify(query, location, maxResults, apiToken);
          normalized = normalizeLinkedInApify(results);
          break;
        }
        case "instagram": {
          const results = await scrapeInstagramApify(
            { usernames, query },
            maxResults,
            apiToken
          );
          normalized = normalizeInstagramApify(results);
          break;
        }
        default:
          throw new Error(`Fuente desconocida: ${source}`);
      }

      // Save all leads to DB
      let savedCount = 0;
      for (const lead of normalized) {
        try {
          await prisma.lead.create({
            data: {
              userId: user.id,
              searchId: search.id,
              ...lead,
            },
          });
          savedCount++;
        } catch {
          // Duplicate or error — skip
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
      const errorMsg = error instanceof Error ? error.message : "Error desconocido";
      await prisma.search.update({
        where: { id: search.id },
        data: { status: "failed", errorMessage: errorMsg },
      }).catch(() => {});

      return NextResponse.json(
        { error: `Error en scraping Apify: ${errorMsg}` },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Apify scrape endpoint error:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
