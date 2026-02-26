import { prisma } from "../db";
import { sendEmailViaBrevo, textToHtml } from "./brevo-email";
import { generateMessage, replacePlaceholders } from "../ai/message-generator";
import { humanDelay } from "../scrapers/shared/delays";
import type { LeadContext } from "../ai/types";

interface RunCampaignOptions {
  campaignId: string;
  userId: string;
  apiKeys: {
    brevoApiKey?: string;
    anthropicApiKey?: string;
    senderEmail?: string;
    senderName?: string;
  };
}

/**
 * Run an email campaign — send personalized messages to each lead
 */
export async function runEmailCampaign(options: RunCampaignOptions) {
  const { campaignId, userId, apiKeys } = options;

  try {
    // Get campaign with template and leads
    const campaign = await prisma.campaign.findFirst({
      where: { id: campaignId, userId },
      include: {
        template: true,
        campaignLeads: {
          where: { status: "pending" },
          include: { lead: true },
        },
      },
    });

    if (!campaign) throw new Error("Campaña no encontrada");
    if (!campaign.template) throw new Error("Campaña sin template");
    if (campaign.campaignLeads.length === 0) throw new Error("No hay leads pendientes");

    // Update campaign status
    await prisma.campaign.update({
      where: { id: campaignId },
      data: { status: "sending", startedAt: new Date() },
    });

    let sentCount = 0;
    let failedCount = 0;

    for (const campaignLead of campaign.campaignLeads) {
      const lead = campaignLead.lead;

      try {
        // Build lead context
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
        let subject: string;

        if (campaign.useAI && apiKeys.anthropicApiKey) {
          // Generate with AI
          const generated = await generateMessage(
            {
              channel: "email",
              templateBase: campaign.template.bodyLong,
              lead: leadContext,
              instructions: campaign.aiInstructions || undefined,
              includeVideo: campaign.includeVideo,
              videoLink: campaign.videoId || undefined,
            },
            apiKeys.anthropicApiKey
          );
          messageBody = generated.messageLong;
          subject = generated.subject || campaign.template.subject || "Propuesta";
        } else {
          // Simple placeholder replacement
          messageBody = replacePlaceholders(campaign.template.bodyLong, leadContext);
          subject = campaign.template.subject
            ? replacePlaceholders(campaign.template.subject, leadContext)
            : "Propuesta";
        }

        if (!lead.email) {
          throw new Error("Lead sin email");
        }

        // Send email via Brevo
        const result = await sendEmailViaBrevo(
          {
            to: { email: lead.email, name: lead.firstName || lead.contactPerson || lead.businessName || undefined },
            subject,
            htmlContent: textToHtml(messageBody, {
              videoLink: campaign.includeVideo ? campaign.videoId || undefined : undefined,
            }),
            textContent: messageBody,
            senderEmail: apiKeys.senderEmail,
            senderName: apiKeys.senderName,
          },
          apiKeys.brevoApiKey
        );

        if (result.success) {
          sentCount++;
          await prisma.campaignLead.update({
            where: { id: campaignLead.id },
            data: {
              status: "sent",
              message: messageBody.substring(0, 500),
              sentAt: new Date(),
            },
          });

          // Log outreach
          await prisma.outreachLog.create({
            data: {
              userId,
              leadId: lead.id,
              campaignId,
              channel: "email",
              action: "email_sent",
              messagePreview: messageBody.substring(0, 200),
              brevoMessageId: result.messageId,
              status: "sent",
            },
          });
        } else {
          throw new Error(result.error || "Error enviando email");
        }
      } catch (error) {
        failedCount++;
        const errorMsg = error instanceof Error ? error.message : "Unknown error";
        await prisma.campaignLead.update({
          where: { id: campaignLead.id },
          data: { status: "failed", errorMessage: errorMsg },
        });
      }

      // Update campaign counts
      await prisma.campaign.update({
        where: { id: campaignId },
        data: { sentCount, failedCount },
      });

      // Delay between emails (3-6 seconds)
      await humanDelay(3000, 6000);
    }

    // Mark campaign as completed
    await prisma.campaign.update({
      where: { id: campaignId },
      data: {
        status: "completed",
        sentCount,
        failedCount,
        completedAt: new Date(),
      },
    });
  } catch (error) {
    console.error("Campaign error:", error);
    await prisma.campaign.update({
      where: { id: campaignId },
      data: {
        status: "failed",
        completedAt: new Date(),
      },
    }).catch(() => {});
  }
}
