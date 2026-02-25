import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma, getOrCreateProfile } from "@/lib/db";
import { resolveApiKey, SYSTEM_KEY_NAMES } from "@/lib/api-keys";
import {
  scrapeGoogleMapsApify,
  scrapeLinkedInApify,
  scrapeInstagramApify,
  normalizeGoogleMapsApify,
  normalizeLinkedInApify,
  normalizeInstagramApify,
  enrichLinkedInEmails,
  enrichLeadsWithEmails,
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

    // Get Apify token: user profile → system DB → env var
    const profile = await getOrCreateProfile(user.id, user.email ?? "");
    const apiToken = await resolveApiKey(SYSTEM_KEY_NAMES.APIFY_API_TOKEN, profile.apifyApiToken);
    if (!apiToken) {
      return NextResponse.json(
        { error: "Configura tu API token de Apify en Settings o contacta al administrador" },
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

          // Second pass: enrich profiles that don't have emails
          const noEmailUrls = normalized
            .filter((l) => !l.email && l.profileUrl)
            .map((l) => l.profileUrl!);

          if (noEmailUrls.length > 0) {
            console.log(`[apify] Enriching ${noEmailUrls.length} LinkedIn profiles with emails...`);
            const emailMap = await enrichLinkedInEmails(noEmailUrls, apiToken);
            for (const lead of normalized) {
              if (!lead.email && lead.profileUrl) {
                const email = emailMap.get(lead.profileUrl);
                if (email) lead.email = email;
              }
            }
            console.log(`[apify] LinkedIn email enrichment: ${emailMap.size} emails found`);
          }
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

      // Enrich leads that have website but no email (Instagram bios, Google Maps, etc.)
      const leadsNeedingEmail = normalized.filter((l) => !l.email && l.website);
      if (leadsNeedingEmail.length > 0) {
        console.log(`[apify] Enriching ${leadsNeedingEmail.length} leads with emails from websites...`);
        const enriched = await enrichLeadsWithEmails(normalized, apiToken);
        console.log(`[apify] Website email enrichment: ${enriched} emails found`);
      }

      // Save all leads to DB (bulk insert, skip duplicates)
      const validLeads = normalized.filter((l) => l.profileUrl);
      const result = await prisma.lead.createMany({
        data: validLeads.map((lead) => ({
          userId: user.id,
          searchId: search.id,
          ...lead,
        })),
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
