/**
 * Stats Service — Dashboard statistics.
 */

import { prisma } from "@/lib/db";
import type { DashboardStats } from "./types";

// ─── Get Dashboard Stats ────────────────────────────────────────────────────

export async function getDashboardStats(
  userId: string
): Promise<DashboardStats> {
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
    prisma.lead.count({ where: { userId } }),
    prisma.lead.count({
      where: { userId, scrapedAt: { gte: today } },
    }),
    prisma.search.count({
      where: { userId, createdAt: { gte: today } },
    }),
    prisma.campaign.count({
      where: { userId, status: { in: ["sending", "draft"] } },
    }),
    prisma.outreachLog.count({
      where: { userId, sentAt: { gte: thisMonth } },
    }),
    prisma.search.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        source: true,
        query: true,
        totalResults: true,
        status: true,
        createdAt: true,
      },
    }),
    prisma.campaign.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        name: true,
        channel: true,
        status: true,
        sentCount: true,
        totalLeads: true,
        createdAt: true,
      },
    }),
    prisma.lead.groupBy({
      by: ["source"],
      where: { userId },
      _count: { id: true },
    }),
  ]);

  return {
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
  };
}
