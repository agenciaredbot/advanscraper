import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/db";
import { scrapeInstagramProfile, searchInstagramProfiles, checkInstagramService } from "@/lib/scrapers/instagram";

export const maxDuration = 60;

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

    try {
      let savedCount = 0;

      if (username) {
        // Single profile scrape
        const profile = await scrapeInstagramProfile(username);
        if (profile && profile.profileUrl) {
          const nameParts = profile.fullName ? profile.fullName.trim().split(/\s+/) : [];
          const result = await prisma.lead.createMany({
            data: [{
              userId: user.id,
              searchId: search.id,
              source: "instagram",
              contactPerson: profile.fullName,
              firstName: nameParts[0] || null,
              lastName: nameParts.length > 1 ? nameParts.slice(1).join(" ") : null,
              email: profile.email,
              phone: profile.phone,
              website: profile.website,
              bio: profile.bio,
              followers: profile.followers,
              isBusiness: profile.isBusiness,
              category: profile.category,
              profileUrl: profile.profileUrl,
              businessName: profile.isBusiness ? profile.fullName : null,
              linkedinUrl: null,
              googleMapsUrl: null,
              state: null,
              industry: null,
            }],
            skipDuplicates: true,
          });
          savedCount = result.count;
        }
      } else {
        // Search scrape (bulk insert)
        const profiles = await searchInstagramProfiles(query, 20);
        const validProfiles = profiles.filter((p) => p.profileUrl);
        if (validProfiles.length > 0) {
          const result = await prisma.lead.createMany({
            data: validProfiles.map((profile) => {
              const parts = profile.fullName ? profile.fullName.trim().split(/\s+/) : [];
              return {
                userId: user.id,
                searchId: search.id,
                source: "instagram",
                contactPerson: profile.fullName,
                firstName: parts[0] || null,
                lastName: parts.length > 1 ? parts.slice(1).join(" ") : null,
                email: profile.email,
                phone: profile.phone,
                website: profile.website,
                bio: profile.bio,
                followers: profile.followers,
                isBusiness: profile.isBusiness,
                category: profile.category,
                profileUrl: profile.profileUrl,
                businessName: profile.isBusiness ? profile.fullName : null,
                linkedinUrl: null,
                googleMapsUrl: null,
                state: null,
                industry: null,
              };
            }),
            skipDuplicates: true,
          });
          savedCount = result.count;
        }
      }

      await prisma.search.update({
        where: { id: search.id },
        data: { status: "completed", totalResults: savedCount, completedAt: new Date() },
      });

      return NextResponse.json({
        success: true,
        searchId: search.id,
        count: savedCount,
        message: `¡${savedCount} perfil(es) obtenido(s)!`,
      });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Error desconocido";
      await prisma.search.update({
        where: { id: search.id },
        data: { status: "failed", errorMessage: errorMsg },
      }).catch(() => {});

      return NextResponse.json(
        { error: `Error en scraping: ${errorMsg}` },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Instagram scrape error:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
