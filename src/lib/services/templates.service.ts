/**
 * Templates Service — CRUD for message templates.
 */

import { prisma } from "@/lib/db";
import { NotFoundError, ValidationError } from "./errors";
import type { CreateTemplateParams, UpdateTemplateParams } from "./types";

// ─── List Templates ──────────────────────────────────────────────────────────

export async function listTemplates(userId: string) {
  return prisma.messageTemplate.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
  });
}

// ─── Get Template ────────────────────────────────────────────────────────────

export async function getTemplate(userId: string, templateId: string) {
  const template = await prisma.messageTemplate.findFirst({
    where: { id: templateId, userId },
  });
  if (!template) throw new NotFoundError("Template");
  return template;
}

// ─── Create Template ─────────────────────────────────────────────────────────

export async function createTemplate(
  userId: string,
  params: CreateTemplateParams
) {
  if (!params.name || !params.channel || !params.bodyLong) {
    throw new ValidationError("name, channel y bodyLong son obligatorios");
  }

  return prisma.messageTemplate.create({
    data: {
      userId,
      name: params.name,
      channel: params.channel,
      subject: params.subject || null,
      bodyShort: params.bodyShort || null,
      bodyLong: params.bodyLong,
      useAI: params.useAI || false,
      aiInstructions: params.aiInstructions || null,
    },
  });
}

// ─── Update Template ─────────────────────────────────────────────────────────

export async function updateTemplate(
  userId: string,
  templateId: string,
  params: UpdateTemplateParams
) {
  const template = await prisma.messageTemplate.findFirst({
    where: { id: templateId, userId },
  });
  if (!template) throw new NotFoundError("Template");

  return prisma.messageTemplate.update({
    where: { id: templateId },
    data: {
      name: params.name,
      channel: params.channel,
      subject: params.subject,
      bodyShort: params.bodyShort,
      bodyLong: params.bodyLong,
      useAI: params.useAI,
      aiInstructions: params.aiInstructions,
      includeVideo: params.includeVideo,
      videoType: params.videoType,
      videoId: params.videoId,
    },
  });
}

// ─── Delete Template ─────────────────────────────────────────────────────────

export async function deleteTemplate(userId: string, templateId: string) {
  const template = await prisma.messageTemplate.findFirst({
    where: { id: templateId, userId },
  });
  if (!template) throw new NotFoundError("Template");

  await prisma.messageTemplate.delete({ where: { id: templateId } });
  return { success: true };
}
