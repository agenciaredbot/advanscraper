import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/db";
import { createJob, updateJobStatus, updateJobProgress, setJobResult, setJobError } from "@/lib/jobs/manager";
import { scrapeInstagramProfile, searchInstagramProfiles, checkInstagramService } from "@/lib/scrapers/instagram";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    // Check if microservice is available
    const serviceOnline = await checkInstagramService();
    if (!serviceOnline) {
      return NextResponse.json(
        { error: "Microservicio de Instagram no disponible. Inícialo o usa Apify." },
        { status: 503 }
      );
    }

    const body = await request.json();
    const { username, query } = body;

    if (!username && !query) {
      return NextResponse.json(
        { error: "Se requiere 'username' o 'query'" },
        { status: 400 }
      );
    }

    const search = await prisma.search.create({
      data: {
        userId: user.id,
        source: "instagram",
        query: username || query,
        status: "running",
      },
    });

    const jobId = createJob(user.id, "instagram_scrape");

    // Start in background
    (async () => {
      try {
        updateJobStatus(jobId, "running");
        updateJobProgress(jobId, {
          phase: "Scrapeando Instagram",
          current: 0,
          total: 1,
          message: username ? `Obteniendo perfil de @${username}...` : `Buscando "${query}"...`,
        });

        let savedCount = 0;

        if (username) {
          // Single profile scrape
          const profile = await scrapeInstagramProfile(username);
          if (profile) {
            await prisma.lead.create({
              data: {
                userId: user.id,
                searchId: search.id,
                source: "instagram",
                contactPerson: profile.fullName,
                email: profile.email,
                phone: profile.phone,
                website: profile.website,
                bio: profile.bio,
                followers: profile.followers,
                isBusiness: profile.isBusiness,
                category: profile.category,
                profileUrl: profile.profileUrl,
                businessName: profile.isBusiness ? profile.fullName : null,
              },
            }).catch(() => {});
            savedCount = 1;
          }
        } else {
          // Search scrape
          const profiles = await searchInstagramProfiles(query, 20);
          for (const profile of profiles) {
            try {
              await prisma.lead.create({
                data: {
                  userId: user.id,
                  searchId: search.id,
                  source: "instagram",
                  contactPerson: profile.fullName,
                  email: profile.email,
                  phone: profile.phone,
                  website: profile.website,
                  bio: profile.bio,
                  followers: profile.followers,
                  isBusiness: profile.isBusiness,
                  category: profile.category,
                  profileUrl: profile.profileUrl,
                  businessName: profile.isBusiness ? profile.fullName : null,
                },
              });
              savedCount++;
            } catch {
              // Duplicate
            }
          }
        }

        await prisma.search.update({
          where: { id: search.id },
          data: { status: "completed", totalResults: savedCount, completedAt: new Date() },
        });

        updateJobStatus(jobId, "completed");
        updateJobProgress(jobId, {
          phase: "Completado",
          current: savedCount,
          total: savedCount,
          message: `¡${savedCount} perfil(es) obtenido(s)!`,
        });
        setJobResult(jobId, { count: savedCount });
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : "Unknown error";
        await prisma.search.update({
          where: { id: search.id },
          data: { status: "failed", errorMessage: errorMsg },
        }).catch(() => {});
        setJobError(jobId, errorMsg);
      }
    })();

    return NextResponse.json({ success: true, jobId, searchId: search.id });
  } catch (error) {
    console.error("Instagram scrape error:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
