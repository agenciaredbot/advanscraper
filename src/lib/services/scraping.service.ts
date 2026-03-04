/**
 * Scraping Service — Start scrapes and check status.
 */

import { prisma, getOrCreateProfile } from "@/lib/db";
import { resolveApiKey, SYSTEM_KEY_NAMES } from "@/lib/api-keys";
import {
  startActorAsync,
  getActorConfig,
  checkActorRun,
  fetchActorResults,
  normalizeBySource,
} from "@/lib/scrapers/apify";
import {
  ValidationError,
  NotFoundError,
  RateLimitError,
  ConfigurationError,
} from "./errors";
import type { StartScrapeParams, ScrapeStatusResult } from "./types";

// ─── Start Scrape ────────────────────────────────────────────────────────────

export async function startScrape(
  userId: string,
  userEmail: string,
  params: StartScrapeParams
): Promise<{ searchId: string; status: string; message: string }> {
  const { source, query, location, maxResults = 50, usernames, pageUrls } = params;

  if (!source || !query) {
    throw new ValidationError("Campos 'source' y 'query' son obligatorios");
  }

  // Check daily limit
  const profile = await getOrCreateProfile(userId, userEmail);

  const todaySearches = await prisma.search.count({
    where: {
      userId,
      createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
    },
  });

  const maxDaily = parseInt(process.env.MAX_DAILY_SCRAPES || "100", 10);
  if (todaySearches >= maxDaily) {
    throw new RateLimitError(`Limite diario alcanzado (${maxDaily} busquedas)`);
  }

  // Resolve Apify token
  const apiToken = await resolveApiKey(
    SYSTEM_KEY_NAMES.APIFY_API_TOKEN,
    profile.apifyApiToken
  );
  if (!apiToken) {
    throw new ConfigurationError(
      "Configura tu API token de Apify en Settings o contacta al administrador"
    );
  }

  // Get actor config
  const { actorId, input } = getActorConfig(source, {
    query,
    location,
    maxResults,
    usernames,
    pageUrls,
  });

  // Start actor async
  const runInfo = await startActorAsync(actorId, input, apiToken);

  // Create search record
  const search = await prisma.search.create({
    data: {
      userId,
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

  return {
    searchId: search.id,
    status: "running",
    message: "Busqueda iniciada. Monitoreando progreso...",
  };
}

// ─── Check Scrape Status ─────────────────────────────────────────────────────

export async function checkScrapeStatus(
  userId: string,
  userEmail: string,
  searchId: string
): Promise<ScrapeStatusResult> {
  const search = await prisma.search.findFirst({
    where: { id: searchId, userId },
  });

  if (!search) throw new NotFoundError("Busqueda");

  // Already completed or failed — return cached
  if (search.status === "completed") {
    return {
      status: "completed",
      phase: "done",
      count: search.totalResults,
      message: `${search.totalResults} leads encontrados!`,
    };
  }

  if (search.status === "failed") {
    return {
      status: "failed",
      error: search.errorMessage || "Error desconocido",
    };
  }

  if (!search.apifyRunId) {
    return {
      status: "failed",
      error: "No hay run de Apify asociado a esta busqueda",
    };
  }

  // Resolve Apify token
  const profile = await getOrCreateProfile(userId, userEmail);
  const apiToken = await resolveApiKey(
    SYSTEM_KEY_NAMES.APIFY_API_TOKEN,
    profile.apifyApiToken
  );
  if (!apiToken) {
    throw new ConfigurationError("Token de Apify no disponible");
  }

  const currentPhase = search.apifyPhase || "scraping";
  const runIdToCheck =
    (currentPhase === "enriching" || currentPhase === "enriching_pages") &&
    search.enrichRunId
      ? search.enrichRunId
      : search.apifyRunId;

  const runInfo = await checkActorRun(runIdToCheck, apiToken);

  // STILL RUNNING
  if (runInfo.status === "RUNNING" || runInfo.status === "READY") {
    const elapsed = runInfo.stats.durationMs
      ? Math.round(runInfo.stats.durationMs / 1000)
      : Math.round(
          (Date.now() - new Date(search.createdAt).getTime()) / 1000
        );

    return {
      status: "running",
      phase: currentPhase,
      progress: {
        itemCount: runInfo.stats.itemCount,
        durationSecs: elapsed,
      },
      message:
        currentPhase === "scraping"
          ? `Scrapeando ${search.source}... ${runInfo.stats.itemCount} items encontrados (${elapsed}s)`
          : currentPhase === "enriching_pages"
            ? `Extrayendo datos de contacto de paginas Facebook... (${elapsed}s)`
            : `Enriqueciendo emails... (${elapsed}s)`,
    };
  }

  // FAILED / ABORTED / TIMED-OUT
  if (runInfo.status !== "SUCCEEDED") {
    const errorMsg = `Apify run ${runInfo.status.toLowerCase()}: ${search.apifyActorId}`;
    await prisma.search.update({
      where: { id: search.id },
      data: { status: "failed", errorMessage: errorMsg },
    });

    return {
      status: "failed",
      error:
        runInfo.status === "TIMED-OUT"
          ? "La busqueda tardo demasiado en Apify. Intenta con menos resultados."
          : `Error en el servicio de scraping (${runInfo.status})`,
    };
  }

  // ── SUCCEEDED ──

  // Phase 1: Scraping completed
  if (currentPhase === "scraping") {
    if (!runInfo.datasetId) {
      await prisma.search.update({
        where: { id: search.id },
        data: { status: "failed", errorMessage: "No dataset returned" },
      });
      return { status: "failed", error: "No se obtuvieron datos" };
    }

    const rawItems = await fetchActorResults(runInfo.datasetId, apiToken);

    // Facebook 2-phase
    if (
      search.source === "facebook" &&
      search.apifyActorId === "danek/facebook-search-ppr" &&
      rawItems.length > 0
    ) {
      const pageUrls = rawItems
        .filter((r) => r.url || r.profile_url)
        .map((r) => ({
          url: (r.url as string) || (r.profile_url as string),
        }))
        .slice(0, 25);

      if (pageUrls.length === 0) {
        await prisma.search.update({
          where: { id: search.id },
          data: {
            status: "failed",
            errorMessage: "No se encontraron paginas de Facebook",
          },
        });
        return {
          status: "failed",
          error: "No se encontraron paginas de Facebook",
        };
      }

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
            totalResults: pageUrls.length,
          },
        });

        return {
          status: "running",
          phase: "enriching_pages",
          count: pageUrls.length,
          message: `${pageUrls.length} paginas encontradas. Extrayendo datos de contacto...`,
        };
      } catch (pagesErr) {
        console.warn("[scraping.service] Facebook pages enrichment failed:", pagesErr);
      }
    }

    // Standard flow: normalize + save
    const normalized = normalizeBySource(search.source, rawItems);
    const validLeads = normalized.filter((l) => l.profileUrl);

    const result = await prisma.lead.createMany({
      data: validLeads.map((lead) => ({
        userId,
        searchId: search.id,
        ...lead,
        source: search.source,
      })),
      skipDuplicates: true,
    });

    const savedCount = result.count;

    // Check if we should enrich emails
    const leadsNeedingEmail = normalized.filter(
      (l) => !l.email && l.website && l.website.startsWith("http")
    );

    if (leadsNeedingEmail.length > 0 && leadsNeedingEmail.length <= 20) {
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

        return {
          status: "running",
          phase: "enriching",
          count: savedCount,
          message: `${savedCount} leads encontrados. Enriqueciendo emails...`,
        };
      } catch (enrichErr) {
        console.warn("[scraping.service] Enrichment start failed:", enrichErr);
      }
    }

    // No enrichment needed
    await prisma.search.update({
      where: { id: search.id },
      data: {
        status: "completed",
        totalResults: savedCount,
        completedAt: new Date(),
        apifyPhase: "done",
      },
    });

    return {
      status: "completed",
      phase: "done",
      count: savedCount,
      message: `${savedCount} leads encontrados!`,
    };
  }

  // Phase 1.5: Facebook pages enrichment completed
  if (currentPhase === "enriching_pages") {
    if (!runInfo.datasetId) {
      await prisma.search.update({
        where: { id: search.id },
        data: {
          status: "failed",
          errorMessage: "No dataset from pages scraper",
        },
      });
      return {
        status: "failed",
        error: "No se obtuvieron datos de contacto",
      };
    }

    const rawItems = await fetchActorResults(runInfo.datasetId, apiToken);
    const normalized = normalizeBySource("facebook", rawItems);
    const validLeads = normalized.filter((l) => l.profileUrl);

    const result = await prisma.lead.createMany({
      data: validLeads.map((lead) => ({
        userId,
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
    return {
      status: "completed",
      phase: "done",
      count: savedCount,
      message: `${savedCount} leads de Facebook encontrados! (${emailCount} con email)`,
    };
  }

  // Phase 2: Enrichment completed
  if (currentPhase === "enriching") {
    let enrichCount = 0;

    if (runInfo.datasetId) {
      try {
        const enrichItems = await fetchActorResults(
          runInfo.datasetId,
          apiToken
        );

        const emailMap = new Map<
          string,
          { email: string | null; phone: string | null }
        >();
        for (const item of enrichItems) {
          const rec = item as Record<string, unknown>;
          const pageUrl = (rec.url as string) || "";
          const emails = (rec.emails as string[]) || [];
          const phones =
            (rec.phones as string[]) ||
            (rec.phoneNumbers as string[]) ||
            [];

          if (pageUrl && (emails.length > 0 || phones.length > 0)) {
            emailMap.set(pageUrl, {
              email: emails[0] || null,
              phone: phones[0] || null,
            });
          }
        }

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

            let matched:
              | { email: string | null; phone: string | null }
              | undefined;
            try {
              const leadHost = new URL(lead.website).hostname.replace(
                "www.",
                ""
              );
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
              if (matched.phone && !lead.phone)
                updateData.phone = matched.phone;

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
        console.warn(
          "[scraping.service] Enrichment processing failed:",
          enrichErr
        );
      }
    }

    const finalCount = search.totalResults || 0;
    await prisma.search.update({
      where: { id: search.id },
      data: {
        status: "completed",
        completedAt: new Date(),
        apifyPhase: "done",
      },
    });

    return {
      status: "completed",
      phase: "done",
      count: finalCount,
      enrichedEmails: enrichCount,
      message: `${finalCount} leads encontrados! (${enrichCount} emails enriquecidos)`,
    };
  }

  // Fallback
  return { status: search.status as "running", phase: currentPhase };
}
