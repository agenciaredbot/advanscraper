import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const thisMonth = new Date();
    thisMonth.setDate(1);
    thisMonth.setHours(0, 0, 0, 0);

    const [
      totalLeads,
      leadsToday,
      searchesToday,
      activeCampaigns,
      messagesSent,
      recentSearches,
      recentCampaigns,
      leadsBySource,
    ] = await Promise.all([
      prisma.lead.count({ where: { userId: user.id } }),
      prisma.lead.count({
        where: { userId: user.id, scrapedAt: { gte: today } },
      }),
      prisma.search.count({
        where: { userId: user.id, createdAt: { gte: today } },
      }),
      prisma.campaign.count({
        where: { userId: user.id, status: { in: ["sending", "draft"] } },
      }),
      prisma.outreachLog.count({
        where: { userId: user.id, sentAt: { gte: thisMonth } },
      }),
      prisma.search.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
        take: 5,
        select: { id: true, source: true, query: true, totalResults: true, status: true, createdAt: true },
      }),
      prisma.campaign.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
        take: 5,
        select: { id: true, name: true, channel: true, status: true, sentCount: true, totalLeads: true, createdAt: true },
      }),
      prisma.lead.groupBy({
        by: ["source"],
        where: { userId: user.id },
        _count: { id: true },
      }),
    ]);

    return NextResponse.json({
      totalLeads,
      leadsToday,
      searchesToday,
      activeCampaigns,
      messagesSent,
      recentSearches,
      recentCampaigns,
      leadsBySource: leadsBySource.map((g) => ({
        source: g.source,
        count: g._count.id,
      })),
    });
  } catch (error) {
    console.error("Dashboard stats error:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
