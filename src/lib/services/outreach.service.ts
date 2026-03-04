/**
 * Outreach Service — Send emails and manage outreach logs.
 */

import { prisma } from "@/lib/db";
import { sendEmailViaBrevo, textToHtml } from "@/lib/outreach/brevo-email";
import {
  extractLoomVideoId,
  buildLoomShareUrl,
  getLoomVideoMeta,
  generateLoomEmailEmbed,
} from "@/lib/outreach/loom";
import { NotFoundError, ValidationError, ConfigurationError } from "./errors";
import type {
  SendEmailParams,
  LogOutreachParams,
  OutreachFilters,
  PaginationParams,
  PaginatedResult,
} from "./types";

// ─── Send Email ──────────────────────────────────────────────────────────────

export async function sendEmail(userId: string, params: SendEmailParams) {
  const { leadId, subject, message, senderName, loomUrl } = params;

  if (!subject || !message) {
    throw new ValidationError("Se requiere subject y message");
  }

  const lead = await prisma.lead.findFirst({
    where: { id: leadId, userId },
  });
  if (!lead) throw new NotFoundError("Lead");

  if (!lead.email) {
    throw new ValidationError("Este lead no tiene email");
  }

  // Resolve Brevo API key
  const profile = await prisma.profile.findUnique({
    where: { id: userId },
    select: { brevoApiKey: true },
  });

  // Build HTML content with optional Loom embed
  let htmlContent = textToHtml(message);

  if (loomUrl) {
    const videoId = extractLoomVideoId(loomUrl);
    if (videoId) {
      const shareUrl = buildLoomShareUrl(videoId);
      const meta = await getLoomVideoMeta(shareUrl);
      if (meta) {
        htmlContent += generateLoomEmailEmbed(
          shareUrl,
          meta.thumbnailUrl,
          meta.title
        );
      }
    }
  }

  const result = await sendEmailViaBrevo(
    {
      to: {
        email: lead.email,
        name:
          lead.businessName ||
          lead.firstName ||
          lead.contactPerson ||
          undefined,
      },
      subject,
      htmlContent,
      textContent: message,
      senderName: senderName || undefined,
    },
    profile?.brevoApiKey || undefined
  );

  if (!result.success) {
    throw new Error(result.error || "Error al enviar email");
  }

  // Log the outreach action
  await prisma.outreachLog.create({
    data: {
      userId,
      leadId,
      channel: "email",
      action: "email_sent",
      messagePreview: message.substring(0, 200),
      brevoMessageId: result.messageId || null,
      status: "sent",
    },
  });

  return {
    success: true,
    messageId: result.messageId,
    message: "Email enviado exitosamente",
  };
}

// ─── Log Outreach ────────────────────────────────────────────────────────────

export async function logOutreach(userId: string, params: LogOutreachParams) {
  const { leadId, channel, action, messagePreview, videoLink } = params;

  if (!leadId || !channel || !action) {
    throw new ValidationError(
      "leadId, channel y action son obligatorios"
    );
  }

  return prisma.outreachLog.create({
    data: {
      userId,
      leadId,
      channel,
      action,
      messagePreview: messagePreview || null,
      videoLink: videoLink || null,
      status: "sent",
    },
  });
}

// ─── List Outreach Logs ──────────────────────────────────────────────────────

export async function listOutreachLogs(
  userId: string,
  filters: OutreachFilters = {},
  pagination: PaginationParams = {}
): Promise<PaginatedResult<unknown>> {
  const page = pagination.page || 1;
  const limit = pagination.limit || 20;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = { userId };
  if (filters.channel) where.channel = filters.channel;

  const [logs, total] = await Promise.all([
    prisma.outreachLog.findMany({
      where,
      orderBy: { sentAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        lead: {
          select: {
            businessName: true,
            contactPerson: true,
            firstName: true,
            lastName: true,
            email: true,
            profileUrl: true,
            state: true,
            industry: true,
            linkedinUrl: true,
            googleMapsUrl: true,
          },
        },
      },
    }),
    prisma.outreachLog.count({ where }),
  ]);

  return {
    data: logs,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}
