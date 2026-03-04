/**
 * AI Service — Generate personalized messages.
 */

import { getOrCreateProfile } from "@/lib/db";
import { generateMessage } from "@/lib/ai/message-generator";
import type { GenerateMessageRequest, GeneratedMessage } from "@/lib/ai/types";
import { ValidationError, ConfigurationError } from "./errors";
import type { GenerateMessageParams, GenerateBulkParams } from "./types";

// ─── Generate Single Message ─────────────────────────────────────────────────

export async function generateAIMessage(
  userId: string,
  userEmail: string,
  params: GenerateMessageParams
): Promise<GeneratedMessage> {
  if (!params.channel || !params.lead) {
    throw new ValidationError("Campos 'channel' y 'lead' son obligatorios");
  }

  const profile = await getOrCreateProfile(userId, userEmail);
  const apiKey = profile.anthropicApiKey || process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new ConfigurationError(
      "Configura tu API key de Anthropic en Settings o .env"
    );
  }

  const request: GenerateMessageRequest = {
    channel: params.channel as GenerateMessageRequest["channel"],
    lead: params.lead,
    templateBase: params.templateBase,
    instructions: params.instructions,
    includeVideo: params.includeVideo,
    videoLink: params.videoLink,
    videoTitle: params.videoTitle,
  };

  return generateMessage(request, apiKey);
}

// ─── Generate Bulk Messages ──────────────────────────────────────────────────

export async function generateAIMessagesBulk(
  userId: string,
  userEmail: string,
  params: GenerateBulkParams
) {
  if (!params.channel || !params.leads || params.leads.length === 0) {
    throw new ValidationError("Campos 'channel' y 'leads' son obligatorios");
  }

  if (params.leads.length > 20) {
    throw new ValidationError("Maximo 20 leads por bulk request");
  }

  const profile = await getOrCreateProfile(userId, userEmail);
  const apiKey = profile.anthropicApiKey || process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new ConfigurationError("Configura tu API key de Anthropic");
  }

  const results: Array<{
    lead: string;
    message: GeneratedMessage | null;
    error?: string;
  }> = [];

  for (const lead of params.leads) {
    try {
      const message = await generateMessage(
        {
          channel: params.channel as GenerateMessageRequest["channel"],
          templateBase: params.templateBase,
          lead,
          instructions: params.instructions,
          includeVideo: params.includeVideo,
          videoLink: params.videoLink,
          videoTitle: params.videoTitle,
        },
        apiKey
      );

      results.push({
        lead:
          (lead.firstName as string) ||
          (lead.contactPerson as string) ||
          (lead.businessName as string) ||
          "Unknown",
        message,
      });
    } catch (error) {
      results.push({
        lead:
          (lead.firstName as string) ||
          (lead.contactPerson as string) ||
          (lead.businessName as string) ||
          "Unknown",
        message: null,
        error: error instanceof Error ? error.message : "Error",
      });
    }
  }

  return {
    channel: params.channel,
    total: params.leads.length,
    generated: results.filter((r) => r.message).length,
    failed: results.filter((r) => !r.message).length,
    results,
  };
}
