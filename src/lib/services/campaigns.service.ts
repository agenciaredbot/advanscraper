/**
 * Campaigns Service — CRUD and send operations for campaigns.
 */

import { prisma, getOrCreateProfile } from "@/lib/db";
import { runEmailCampaign } from "@/lib/outreach/campaign-manager";
import { NotFoundError, ValidationError, ConfigurationError } from "./errors";
import type { CreateCampaignParams, SendCampaignResult } from "./types";

// ─── List Campaigns ──────────────────────────────────────────────────────────

export async function listCampaigns(userId: string) {
  return prisma.campaign.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: {
      template: { select: { name: true, channel: true } },
      _count: { select: { campaignLeads: true } },
    },
  });
}

// ─── Get Campaign Detail ─────────────────────────────────────────────────────

export async function getCampaign(userId: string, campaignId: string) {
  const campaign = await prisma.campaign.findFirst({
    where: { id: campaignId, userId },
    include: {
      template: true,
      campaignLeads: {
        include: {
          lead: {
            select: {
              id: true,
              businessName: true,
              contactPerson: true,
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
              city: true,
              state: true,
              industry: true,
              linkedinUrl: true,
              googleMapsUrl: true,
            },
          },
        },
        orderBy: { sentAt: "desc" },
      },
    },
  });

  if (!campaign) throw new NotFoundError("Campana");
  return campaign;
}

// ─── Create Campaign ─────────────────────────────────────────────────────────

export async function createCampaign(
  userId: string,
  params: CreateCampaignParams
) {
  const {
    name,
    channel,
    templateId,
    leadIds,
    listId,
    useAI,
    aiInstructions,
    includeVideo,
    videoType,
    videoId,
  } = params;

  if (!name || !channel) {
    throw new ValidationError("name y channel son obligatorios");
  }

  let targetLeadIds: string[] = leadIds || [];

  if (listId && (!leadIds || leadIds.length === 0)) {
    const listItems = await prisma.leadListItem.findMany({
      where: { listId },
      select: { leadId: true },
    });
    targetLeadIds = listItems.map((i) => i.leadId);
  }

  if (targetLeadIds.length === 0) {
    throw new ValidationError("Selecciona al menos un lead");
  }

  const campaign = await prisma.campaign.create({
    data: {
      userId,
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
    await prisma.campaignLead
      .create({ data: { campaignId: campaign.id, leadId } })
      .catch(() => {}); // Skip duplicates
  }

  return campaign;
}

// ─── Delete Campaign ─────────────────────────────────────────────────────────

export async function deleteCampaign(userId: string, campaignId: string) {
  const campaign = await prisma.campaign.findFirst({
    where: { id: campaignId, userId },
  });
  if (!campaign) throw new NotFoundError("Campana");

  await prisma.campaign.delete({ where: { id: campaignId } });
  return { success: true };
}

// ─── Send Campaign ───────────────────────────────────────────────────────────

export async function sendCampaign(
  userId: string,
  userEmail: string,
  campaignId: string
): Promise<SendCampaignResult> {
  const campaign = await prisma.campaign.findFirst({
    where: { id: campaignId, userId },
  });
  if (!campaign) throw new NotFoundError("Campana");

  if (campaign.status !== "draft" && campaign.status !== "paused") {
    throw new ValidationError(
      `Campana en estado "${campaign.status}" no se puede enviar`
    );
  }

  const profile = await getOrCreateProfile(userId, userEmail);

  if (campaign.channel === "email") {
    const brevoKey = profile.brevoApiKey || process.env.BREVO_API_KEY;
    if (!brevoKey) {
      throw new ConfigurationError(
        "Configura tu API key de Brevo en Settings"
      );
    }

    // Start campaign in background
    runEmailCampaign({
      campaignId,
      userId,
      apiKeys: {
        brevoApiKey: brevoKey,
        anthropicApiKey:
          profile.anthropicApiKey ||
          process.env.ANTHROPIC_API_KEY ||
          undefined,
        senderEmail: process.env.BREVO_SENDER_EMAIL,
        senderName: process.env.BREVO_SENDER_NAME,
      },
    }).catch((err) => {
      console.error("Campaign send error:", err);
    });

    return {
      success: true,
      message:
        "Campana iniciada. Revisa el progreso en el dashboard de campana.",
    };
  }

  throw new ValidationError(
    `Canal "${campaign.channel}" no soportado para envio automatico todavia`
  );
}
