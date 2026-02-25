import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma, getOrCreateProfile } from "@/lib/db";
import { resolveApiKey, SYSTEM_KEY_NAMES } from "@/lib/api-keys";
import {
  checkActorRun,
  fetchActorResults,
  normalizeBySource,
  startActorAsync,
  enrichLeadsWithEmails,
} from "@/lib/scrapers/apify";

export const maxDuration = 30;

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const searchId = request.nextUrl.searchParams.get("searchId");
    if (!searchId) {
      return NextResponse.json({ error: "searchId requerido" }, { status: 400 });
    }

    // Load search record
    const search = await prisma.search.findFirst({
      where: { id: searchId, userId: user.id },
    });

    if (!search) {
      return NextResponse.json({ error: "Búsqueda no encontrada" }, { status: 404 });
    }

    // If already completed or failed, return cached result
    if (search.status === "completed") {
      return NextResponse.json({
        status: "completed",
        phase: "done",
        count: search.totalResults,
        message: `¡${search.totalResults} leads encontrados!`,
      });
    }

    if (search.status === "failed") {
      return NextResponse.json({
        status: "failed",
        error: search.errorMessage || "Error desconocido",
      });
    }

    // Need Apify run ID to check status
    if (!search.apifyRunId) {
      return NextResponse.json({
        status: "failed",
        error: "No hay run de Apify asociado a esta búsqueda",
      });
    }

    // Resolve Apify token
    const profile = await getOrCreateProfile(user.id, user.email ?? "");
    const apiToken = await resolveApiKey(SYSTEM_KEY_NAMES.APIFY_API_TOKEN, profile.apifyApiToken);
    if (!apiToken) {
      return NextResponse.json({ error: "Token de Apify no disponible" }, { status: 400 });
    }

    // ── Check which phase we're in ──
    const currentPhase = search.apifyPhase || "scraping";
    const runIdToCheck =
      (currentPhase === "enriching" || currentPhase === "enriching_pages") && search.enrichRunId
        ? search.enrichRunId
        : search.apifyRunId;

    const runInfo = await checkActorRun(runIdToCheck, apiToken);

    // ── STILL RUNNING ──
    if (runInfo.status === "RUNNING" || runInfo.status === "READY") {
      const elapsed = runInfo.stats.durationMs
        ? Math.round(runInfo.stats.durationMs / 1000)
        : Math.round((Date.now() - new Date(search.createdAt).getTime()) / 1000);

      return NextResponse.json({
        status: "running",
        phase: currentPhase,
        progress: {
          itemCount: runInfo.stats.itemCount,
          durationSecs: elapsed,
        },
        message: currentPhase === "scraping"
          ? `Scrapeando ${search.source}... ${runInfo.stats.itemCount} items encontrados (${elapsed}s)`
          : currentPhase === "enriching_pages"
            ? `Extrayendo datos de contacto de páginas Facebook... (${elapsed}s)`
            : `Enriqueciendo emails... (${elapsed}s)`,
      });
    }

    // ── FAILED / ABORTED / TIMED-OUT ──
    if (runInfo.status !== "SUCCEEDED") {
      const errorMsg = `Apify run ${runInfo.status.toLowerCase()}: ${search.apifyActorId}`;
      await prisma.search.update({
        where: { id: search.id },
        data: { status: "failed", errorMessage: errorMsg },
      });

      return NextResponse.json({
        status: "failed",
        error: runInfo.status === "TIMED-OUT"
          ? "La búsqueda tardó demasiado en Apify. Intenta con menos resultados."
          : `Error en el servicio de scraping (${runInfo.status})`,
      });
    }

    // ── SUCCEEDED ──

    // Phase 1: Scraping completed → download + normalize + save
    if (currentPhase === "scraping") {
      if (!runInfo.datasetId) {
        await prisma.search.update({
          where: { id: search.id },
          data: { status: "failed", errorMessage: "No dataset returned" },
        });
        return NextResponse.json({ status: "failed", error: "No se obtuvieron datos" });
      }

      const rawItems = await fetchActorResults(runInfo.datasetId, apiToken);

      // ── FACEBOOK 2-PHASE: search → enrich pages ──
      // If this is Facebook keyword search (danek/facebook-search-ppr),
      // the results are just URLs. We need a second actor to get contact info.
      if (
        search.source === "facebook" &&
        search.apifyActorId === "danek/facebook-search-ppr" &&
        rawItems.length > 0
      ) {
        // Extract page URLs from search results
        const pageUrls = rawItems
          .filter((r) => r.url || r.profile_url)
          .map((r) => ({ url: (r.url as string) || (r.profile_url as string) }))
          .slice(0, 25); // Max 25 pages to enrich

        if (pageUrls.length === 0) {
          await prisma.search.update({
            where: { id: search.id },
            data: { status: "failed", errorMessage: "No se encontraron páginas de Facebook" },
          });
          return NextResponse.json({ status: "failed", error: "No se encontraron páginas de Facebook" });
        }

        // Start phase 2: scrape full page details
        try {
          const pagesRunInfo = await startActorAsync(
            "apify/facebook-pages-scraper",
            {
              startUrls: pageUrls,
              scrapeAbout: true,
              scrapePosts: false,
              scrapeReviews: false,
              scrapeServices: false,
              proxyConfiguration: { useApifyProxy: true },
            },
            apiToken
          );

          await prisma.search.update({
            where: { id: search.id },
            data: {
              apifyPhase: "enriching_pages",
              enrichRunId: pagesRunInfo.runId,
              totalResults: pageUrls.length, // Temporary count until phase 2 completes
            },
          });

          return NextResponse.json({
            status: "running",
            phase: "enriching_pages",
            count: pageUrls.length,
            message: `${pageUrls.length} páginas encontradas. Extrayendo datos de contacto...`,
          });
        } catch (pagesErr) {
          console.warn("[scrape/status] Facebook pages enrichment failed:", pagesErr);
          // Fall through — save basic results without contact details
        }
      }

      // ── Standard flow: normalize + save ──
      const normalized = normalizeBySource(search.source, rawItems);
      const validLeads = normalized.filter((l) => l.profileUrl);

      // Save leads to DB
      const result = await prisma.lead.createMany({
        data: validLeads.map((lead) => ({
          userId: user.id,
          searchId: search.id,
          ...lead,
          source: search.source,
        })),
        skipDuplicates: true,
      });

      const savedCount = result.count;

      // Check if we should enrich emails (leads with website but no email)
      const leadsNeedingEmail = normalized.filter((l) => !l.email && l.website && l.website.startsWith("http"));

      if (leadsNeedingEmail.length > 0 && leadsNeedingEmail.length <= 20) {
        // Start async email enrichment as a second phase
        try {
          const enrichRunInfo = await startActorAsync(
            "anchor/email-phone-extractor",
            {
              startUrls: leadsNeedingEmail
                .map((l) => l.website!)
                .slice(0, 15)
                .map((url) => ({ url })),
              maxDepth: 2,
              sameDomain: true,
              maxRequestsPerStartUrl: 5,
              maxRequests: Math.min(leadsNeedingEmail.length, 15) * 5,
              proxyConfig: { useApifyProxy: true },
              considerChildFrames: true,
            },
            apiToken
          );

          await prisma.search.update({
            where: { id: search.id },
            data: {
              apifyPhase: "enriching",
              enrichRunId: enrichRunInfo.runId,
              totalResults: savedCount,
            },
          });

          return NextResponse.json({
            status: "running",
            phase: "enriching",
            count: savedCount,
            message: `${savedCount} leads encontrados. Enriqueciendo emails...`,
          });
        } catch (enrichErr) {
          // Enrichment failed to start — not critical, complete without it
          console.warn("[scrape/status] Enrichment start failed:", enrichErr);
        }
      }

      // No enrichment needed or enrichment start failed → mark completed
      await prisma.search.update({
        where: { id: search.id },
        data: {
          status: "completed",
          totalResults: savedCount,
          completedAt: new Date(),
          apifyPhase: "done",
        },
      });

      return NextResponse.json({
        status: "completed",
        phase: "done",
        count: savedCount,
        message: `¡${savedCount} leads encontrados!`,
      });
    }

    // Phase 1.5: Facebook pages enrichment completed → normalize + save
    if (currentPhase === "enriching_pages") {
      if (!runInfo.datasetId) {
        await prisma.search.update({
          where: { id: search.id },
          data: { status: "failed", errorMessage: "No dataset from pages scraper" },
        });
        return NextResponse.json({ status: "failed", error: "No se obtuvieron datos de contacto" });
      }

      const rawItems = await fetchActorResults(runInfo.datasetId, apiToken);
      const normalized = normalizeBySource("facebook", rawItems);
      const validLeads = normalized.filter((l) => l.profileUrl);

      const result = await prisma.lead.createMany({
        data: validLeads.map((lead) => ({
          userId: user.id,
          searchId: search.id,
          ...lead,
          source: "facebook",
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
          apifyPhase: "done",
        },
      });

      const emailCount = validLeads.filter((l) => l.email).length;
      return NextResponse.json({
        status: "completed",
        phase: "done",
        count: savedCount,
        message: `¡${savedCount} leads de Facebook encontrados! (${emailCount} con email)`,
      });
    }

    // Phase 2: Enrichment completed → update leads with emails
    if (currentPhase === "enriching") {
      let enrichCount = 0;

      if (runInfo.datasetId) {
        try {
          const enrichItems = await fetchActorResults(runInfo.datasetId, apiToken);

          // Build a map from website URL → email/phone
          const emailMap = new Map<string, { email: string | null; phone: string | null }>();
          for (const item of enrichItems) {
            const rec = item as Record<string, unknown>;
            const pageUrl = (rec.url as string) || "";
            const emails = (rec.emails as string[]) || [];
            const phones = (rec.phones as string[]) || (rec.phoneNumbers as string[]) || [];

            if (pageUrl && (emails.length > 0 || phones.length > 0)) {
              emailMap.set(pageUrl, {
                email: emails[0] || null,
                phone: phones[0] || null,
              });
            }
          }

          // Update leads that match
          if (emailMap.size > 0) {
            const leadsToUpdate = await prisma.lead.findMany({
              where: {
                searchId: search.id,
                email: null,
                website: { not: null },
              },
            });

            for (const lead of leadsToUpdate) {
              if (!lead.website) continue;

              // Match by hostname
              let matched: { email: string | null; phone: string | null } | undefined;
              try {
                const leadHost = new URL(lead.website).hostname.replace("www.", "");
                for (const [url, data] of emailMap) {
                  if (url.includes(leadHost)) {
                    matched = data;
                    break;
                  }
                }
              } catch {
                continue;
              }

              if (matched && (matched.email || matched.phone)) {
                const updateData: Record<string, string> = {};
                if (matched.email) updateData.email = matched.email;
                if (matched.phone && !lead.phone) updateData.phone = matched.phone;

                if (Object.keys(updateData).length > 0) {
                  await prisma.lead.update({
                    where: { id: lead.id },
                    data: updateData,
                  });
                  if (matched.email) enrichCount++;
                }
              }
            }
          }
        } catch (enrichErr) {
          console.warn("[scrape/status] Enrichment processing failed:", enrichErr);
        }
      }

      // Mark search as completed
      const finalCount = search.totalResults || 0;
      await prisma.search.update({
        where: { id: search.id },
        data: {
          status: "completed",
          completedAt: new Date(),
          apifyPhase: "done",
        },
      });

      return NextResponse.json({
        status: "completed",
        phase: "done",
        count: finalCount,
        enrichedEmails: enrichCount,
        message: `¡${finalCount} leads encontrados! (${enrichCount} emails enriquecidos)`,
      });
    }

    // Fallback
    return NextResponse.json({ status: search.status, phase: currentPhase });

  } catch (error) {
    console.error("[scrape/status] Error:", error);
    const msg = error instanceof Error ? error.message : "Error interno";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
