import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma, getOrCreateProfile } from "@/lib/db";
import {
  scrapeGoogleMapsRemote,
  checkPlaywrightService,
  type GoogleMapsResult,
} from "@/lib/scrapers/playwright-service";
import {
  scrapeGoogleMapsApify,
  normalizeGoogleMapsApify,
  enrichEmailsFromWebsites,
} from "@/lib/scrapers/apify";
import { resolveApiKey, SYSTEM_KEY_NAMES } from "@/lib/api-keys";

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

    // ─── Strategy: Apify PRIMARY → Playwright FALLBACK ─────────────────
    const startTime = Date.now();
    try {
      let leadsToSave: {
        source: string;
        businessName: string | null;
        category: string | null;
        address: string | null;
        city: string | null;
        phone: string | null;
        website: string | null;
        email: string | null;
        rating: number | null;
        reviewsCount: number | null;
        profileUrl: string | null;
      }[] = [];

      let usedProvider = "apify";

      // ── Strategy 1: Try Apify first (reliable, managed) ──
      const apifyToken = await resolveApiKey(
        SYSTEM_KEY_NAMES.APIFY_API_TOKEN,
        profile.apifyApiToken
      );

      if (apifyToken) {
        try {
          console.log("[google-maps] Trying Apify (primary)...");
          const apifyResults = await scrapeGoogleMapsApify(
            query,
            location,
            Math.min(maxResults, 80),
            apifyToken
          );

          const normalized = normalizeGoogleMapsApify(apifyResults);
          leadsToSave = normalized.map((n) => ({
            source: "google_maps",
            businessName: n.businessName,
            category: n.category,
            address: n.address,
            city: n.city || location || null,
            phone: n.phone,
            website: n.website,
            email: n.email,
            rating: n.rating,
            reviewsCount: n.reviewsCount,
            profileUrl: n.profileUrl,
          }));
          usedProvider = "apify";
          console.log(
            `[google-maps] Apify success: ${leadsToSave.length} results in ${Math.round((Date.now() - startTime) / 1000)}s`
          );
        } catch (apifyError) {
          console.warn(
            "[google-maps] Apify failed, trying Playwright fallback:",
            apifyError instanceof Error ? apifyError.message : apifyError
          );
          // Fall through to Playwright
        }
      }

      // ── Strategy 2: Playwright fallback (if Apify unavailable or failed) ──
      if (leadsToSave.length === 0) {
        const serviceOnline = await checkPlaywrightService();
        if (!serviceOnline) {
          // Both providers failed
          await prisma.search
            .update({
              where: { id: search.id },
              data: {
                status: "failed",
                errorMessage: "Ningún servicio de scraping disponible",
              },
            })
            .catch(() => {});

          return NextResponse.json(
            {
              error: apifyToken
                ? "Apify falló y el microservicio Playwright no está disponible. Intenta de nuevo en unos minutos."
                : "Configura tu API token de Apify en Settings o contacta al administrador. El microservicio Playwright tampoco está disponible.",
            },
            { status: 503 }
          );
        }

        console.log("[google-maps] Trying Playwright (fallback)...");
        const playwrightResults: GoogleMapsResult[] =
          await scrapeGoogleMapsRemote({
            query,
            location,
            maxResults: Math.min(maxResults, 80),
            extractEmails,
          });

        leadsToSave = playwrightResults.map((data) => ({
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
        }));
        usedProvider = "playwright";
        console.log(
          `[google-maps] Playwright success: ${leadsToSave.length} results`
        );
      }

      // ── Email enrichment: scrape emails from business websites ──
      // Only attempt if we have time left (Vercel limit: 60s, we need ~5s buffer for DB save)
      const elapsedMs = Date.now() - startTime;
      const timeLeftMs = 55_000 - elapsedMs; // 55s budget (5s buffer for DB operations)

      if (timeLeftMs > 10_000 && apifyToken) {
        // Only enrich if we have >10s left
        const needsEmail = leadsToSave.filter(
          (l) => !l.email && l.website && l.website.startsWith("http")
        );

        if (needsEmail.length > 0) {
          console.log(
            `[google-maps] Enriching ${needsEmail.length} leads (${Math.round(timeLeftMs / 1000)}s budget)...`
          );
          try {
            const websiteUrls = needsEmail.map((l) => l.website!);
            const enriched = await enrichEmailsFromWebsites(
              websiteUrls.slice(0, 15), // Max 15 websites to keep under time budget
              apifyToken
            );

            let enrichCount = 0;
            for (const lead of needsEmail) {
              if (!lead.website) continue;
              const data = enriched.get(lead.website);
              if (data?.email) {
                lead.email = data.email;
                enrichCount++;
              }
              if (data?.phone && !lead.phone) {
                lead.phone = data.phone;
              }
            }
            console.log(
              `[google-maps] Enrichment: ${enrichCount} emails found from websites`
            );
          } catch (enrichError) {
            // Enrichment is non-critical — continue with results we have
            console.warn(
              "[google-maps] Email enrichment failed (non-critical):",
              enrichError instanceof Error ? enrichError.message : enrichError
            );
          }
        }
      } else {
        console.log(
          `[google-maps] Skipping email enrichment (only ${Math.round(timeLeftMs / 1000)}s left)`
        );
      }

      // ── Save results to DB (bulk insert, skip duplicates) ──
      const savedCount = await saveLeadsBulk(
        leadsToSave,
        user.id,
        search.id
      );

      await prisma.search.update({
        where: { id: search.id },
        data: {
          status: "completed",
          totalResults: savedCount,
          completedAt: new Date(),
        },
      });

      const totalSecs = Math.round((Date.now() - startTime) / 1000);
      const emailCount = leadsToSave.filter((l) => l.email).length;

      return NextResponse.json({
        success: true,
        searchId: search.id,
        count: savedCount,
        provider: usedProvider,
        message: `¡${savedCount} leads encontrados! (${emailCount} con email, ${totalSecs}s)`,
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
      if (
        lower.includes("unusual traffic") ||
        lower.includes("tráfico inusual") ||
        lower.includes("detectó")
      ) {
        userMsg =
          "Google detectó automatización. Espera unos minutos e intenta de nuevo.";
      } else if (lower.includes("captcha") || lower.includes("bloqueó")) {
        userMsg =
          "Google bloqueó la solicitud. Espera unos minutos e intenta de nuevo.";
      } else if (lower.includes("timeout") || lower.includes("tardó")) {
        userMsg =
          "La búsqueda tardó demasiado. Intenta con menos resultados o una búsqueda más específica.";
      } else if (
        lower.includes("not available") ||
        lower.includes("no disponible")
      ) {
        userMsg =
          "El servicio de scraping no está disponible. Verifica que esté corriendo.";
      } else if (lower.includes("no se encontraron resultados")) {
        userMsg = rawMsg; // Already user-friendly
      } else if (lower.includes("apify")) {
        userMsg =
          "Error en el servicio de scraping. Intenta de nuevo en unos minutos.";
      }

      return NextResponse.json({ error: userMsg }, { status: 500 });
    }
  } catch (error) {
    console.error("Scrape endpoint error:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

// ─── Bulk insert leads (skip duplicates) ─────────────────────────────────────

async function saveLeadsBulk(
  leads: {
    source: string;
    businessName: string | null;
    category: string | null;
    address: string | null;
    city: string | null;
    phone: string | null;
    website: string | null;
    email: string | null;
    rating: number | null;
    reviewsCount: number | null;
    profileUrl: string | null;
  }[],
  userId: string,
  searchId: string
): Promise<number> {
  if (leads.length === 0) return 0;

  // Filter out leads without a profileUrl (required for unique constraint)
  const validLeads = leads.filter((l) => l.profileUrl);

  if (validLeads.length === 0) return 0;

  const result = await prisma.lead.createMany({
    data: validLeads.map((lead) => ({
      userId,
      searchId,
      ...lead,
    })),
    skipDuplicates: true,
  });

  return result.count;
}
