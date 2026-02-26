import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma, getOrCreateProfile } from "@/lib/db";
import { sendWhatsAppCampaign, WhatsAppCampaignMessage } from "@/lib/outreach/whatsapp";
import { generateMessage, replacePlaceholders } from "@/lib/ai/message-generator";
import type { LeadContext } from "@/lib/ai/types";

// POST — Send WhatsApp campaign
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { id: campaignId } = await params;

    const campaign = await prisma.campaign.findFirst({
      where: { id: campaignId, userId: user.id },
      include: {
        template: true,
        campaignLeads: {
          where: { status: "pending" },
          include: { lead: true },
        },
      },
    });

    if (!campaign) return NextResponse.json({ error: "Campaña no encontrada" }, { status: 404 });
    if (campaign.channel !== "whatsapp") {
      return NextResponse.json({ error: "Esta campaña no es de WhatsApp" }, { status: 400 });
    }
    if (!campaign.template) return NextResponse.json({ error: "Campaña sin template" }, { status: 400 });
    if (campaign.campaignLeads.length === 0) {
      return NextResponse.json({ error: "No hay leads pendientes" }, { status: 400 });
    }

    const profile = await getOrCreateProfile(user.id, user.email ?? "");
    const anthropicKey = profile.anthropicApiKey || process.env.ANTHROPIC_API_KEY;

    // Update campaign status
    await prisma.campaign.update({
      where: { id: campaignId },
      data: { status: "sending", startedAt: new Date() },
    });

    // Build messages
    const messages: WhatsAppCampaignMessage[] = [];

    for (const cl of campaign.campaignLeads) {
      const lead = cl.lead;

      if (!lead.phone) {
        await prisma.campaignLead.update({
          where: { id: cl.id },
          data: { status: "skipped", errorMessage: "Sin teléfono" },
        });
        continue;
      }

      const leadContext: LeadContext = {
        businessName: lead.businessName,
        contactPerson: lead.contactPerson,
        firstName: lead.firstName,
        lastName: lead.lastName,
        contactTitle: lead.contactTitle,
        email: lead.email,
        phone: lead.phone,
        website: lead.website,
        city: lead.city,
        category: lead.category,
        rating: lead.rating,
        followers: lead.followers,
        bio: lead.bio,
        profileUrl: lead.profileUrl,
      };

      let messageBody: string;

      try {
        if (campaign.useAI && anthropicKey) {
          const generated = await generateMessage(
            {
              channel: "whatsapp",
              templateBase: campaign.template.bodyLong,
              lead: leadContext,
              instructions: campaign.aiInstructions || undefined,
              includeVideo: campaign.includeVideo,
              videoLink: campaign.videoId || undefined,
            },
            anthropicKey
          );
          messageBody = generated.messageLong;
        } else {
          messageBody = replacePlaceholders(campaign.template.bodyLong, leadContext);
        }

        messages.push({
          phone: lead.phone,
          message: messageBody,
          leadName: lead.firstName || lead.contactPerson || lead.businessName || undefined,
        });

        // Update campaign lead with message preview
        await prisma.campaignLead.update({
          where: { id: cl.id },
          data: { message: messageBody.substring(0, 500) },
        });
      } catch (error) {
        await prisma.campaignLead.update({
          where: { id: cl.id },
          data: {
            status: "failed",
            errorMessage: error instanceof Error ? error.message : "Error generando mensaje",
          },
        });
      }
    }

    if (messages.length === 0) {
      await prisma.campaign.update({
        where: { id: campaignId },
        data: { status: "failed", completedAt: new Date() },
      });
      return NextResponse.json({ error: "No hay mensajes válidos para enviar" }, { status: 400 });
    }

    // Send via WhatsApp microservice (runs in background)
    sendWhatsAppCampaign(messages).then(async (result) => {
      // Update campaign leads based on result
      let sentCount = 0;
      let failedCount = 0;

      for (const cl of campaign.campaignLeads) {
        if (cl.lead.phone) {
          // Mark as sent (simplified — in production would match by phone)
          if (result.success || sentCount < result.sent) {
            sentCount++;
            await prisma.campaignLead.update({
              where: { id: cl.id },
              data: { status: "sent", sentAt: new Date() },
            }).catch(() => {});

            await prisma.outreachLog.create({
              data: {
                userId: user.id,
                leadId: cl.leadId,
                campaignId,
                channel: "whatsapp",
                action: "whatsapp_sent",
                messagePreview: cl.message?.substring(0, 200) || null,
                status: "sent",
              },
            }).catch(() => {});
          } else {
            failedCount++;
            await prisma.campaignLead.update({
              where: { id: cl.id },
              data: { status: "failed", errorMessage: "Error en envío" },
            }).catch(() => {});
          }
        }
      }

      await prisma.campaign.update({
        where: { id: campaignId },
        data: {
          status: "completed",
          sentCount,
          failedCount,
          completedAt: new Date(),
        },
      }).catch(() => {});
    }).catch(async () => {
      await prisma.campaign.update({
        where: { id: campaignId },
        data: { status: "failed", completedAt: new Date() },
      }).catch(() => {});
    });

    return NextResponse.json({
      success: true,
      message: `Enviando ${messages.length} mensajes WhatsApp. Revisa el progreso en el dashboard.`,
    });
  } catch (error) {
    console.error("WhatsApp campaign error:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
