import { NextResponse } from "next/server";
import { requireSuperadmin } from "@/lib/admin";
import { prisma } from "@/lib/db";

export async function GET() {
  const { error } = await requireSuperadmin();
  if (error) return error;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [
    totalUsers,
    activeUsers,
    totalLeads,
    totalSearches,
    totalCampaigns,
    leadsToday,
    searchesToday,
    newUsersToday,
  ] = await Promise.all([
    prisma.profile.count(),
    prisma.profile.count({ where: { isActive: true } }),
    prisma.lead.count(),
    prisma.search.count(),
    prisma.campaign.count(),
    prisma.lead.count({ where: { scrapedAt: { gte: today } } }),
    prisma.search.count({ where: { createdAt: { gte: today } } }),
    prisma.profile.count({ where: { createdAt: { gte: today } } }),
  ]);

  return NextResponse.json({
    totalUsers,
    activeUsers,
    totalLeads,
    totalSearches,
    totalCampaigns,
    leadsToday,
    searchesToday,
    newUsersToday,
  });
}
