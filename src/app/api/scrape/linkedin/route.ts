import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/db";
import { createJob } from "@/lib/jobs/manager";
import { scrapeLinkedIn } from "@/lib/scrapers/linkedin";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

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

    // Start in background
    scrapeLinkedIn({
      keyword,
      location,
      maxResults: Math.min(maxResults, 50),
      jobId,
      userId: user.id,
      searchId: search.id,
    }).catch((err) => {
      console.error("Background LinkedIn scrape error:", err);
    });

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
