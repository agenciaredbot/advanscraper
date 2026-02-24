import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/db";

// GET — List leads with pagination and filters
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const source = searchParams.get("source");
    const city = searchParams.get("city");
    const hasEmail = searchParams.get("hasEmail");
    const hasPhone = searchParams.get("hasPhone");
    const searchId = searchParams.get("searchId");
    const search = searchParams.get("search");

    // Build where clause
    const where: Record<string, unknown> = { userId: user.id };
    if (source) where.source = source;
    if (city) where.city = { contains: city, mode: "insensitive" };
    if (hasEmail === "true") where.email = { not: null };
    if (hasPhone === "true") where.phone = { not: null };
    if (searchId) where.searchId = searchId;
    if (search) {
      where.OR = [
        { businessName: { contains: search, mode: "insensitive" } },
        { contactPerson: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { category: { contains: search, mode: "insensitive" } },
      ];
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [leads, total] = await Promise.all([
      prisma.lead.findMany({
        where: where as any,
        orderBy: { scrapedAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          listItems: {
            include: {
              list: { select: { id: true, name: true, color: true } },
            },
          },
        },
      }),
      prisma.lead.count({
        where: where as any,
      }),
    ]);

    return NextResponse.json({
      leads,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Leads GET error:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
