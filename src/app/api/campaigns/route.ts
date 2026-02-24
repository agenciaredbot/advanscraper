import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/db";

// GET — List campaigns
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const campaigns = await prisma.campaign.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      include: {
        template: { select: { name: true, channel: true } },
        _count: { select: { campaignLeads: true } },
      },
    });

    return NextResponse.json(campaigns);
  } catch (error) {
    console.error("Campaigns GET error:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

// POST — Create campaign
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const body = await request.json();
    const {
      name, channel, templateId, leadIds, listId,
      useAI, aiInstructions, includeVideo, videoType, videoId,
    } = body;

    if (!name || !channel) {
      return NextResponse.json({ error: "name y channel son obligatorios" }, { status: 400 });
    }

    // Get leads from leadIds or from a list
    let targetLeadIds: string[] = leadIds || [];

    if (listId && (!leadIds || leadIds.length === 0)) {
      const listItems = await prisma.leadListItem.findMany({
        where: { listId },
        select: { leadId: true },
      });
      targetLeadIds = listItems.map((i) => i.leadId);
    }

    if (targetLeadIds.length === 0) {
      return NextResponse.json({ error: "Selecciona al menos un lead" }, { status: 400 });
    }

    // Create campaign
    const campaign = await prisma.campaign.create({
      data: {
        userId: user.id,
        name,
        channel,
        templateId: templateId || null,
        totalLeads: targetLeadIds.length,
        useAI: useAI || false,
        aiInstructions: aiInstructions || null,
        includeVideo: includeVideo || false,
        videoType: videoType || null,
        videoId: videoId || null,
      },
    });

    // Create campaign leads
    for (const leadId of targetLeadIds) {
      await prisma.campaignLead.create({
        data: { campaignId: campaign.id, leadId },
      }).catch(() => {}); // Skip duplicates
    }

    return NextResponse.json(campaign, { status: 201 });
  } catch (error) {
    console.error("Campaign POST error:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
