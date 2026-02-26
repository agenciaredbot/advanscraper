import { generateWithClaude } from "./claude-client";
import { CHANNEL_SYSTEM_PROMPTS, TEMPLATE_IMPROVEMENT_PROMPT } from "./prompts";
import type { GenerateMessageRequest, GeneratedMessage, LeadContext } from "./types";

/**
 * Build a context string from lead data
 */
function buildLeadContext(lead: LeadContext): string {
  const parts: string[] = [];
  if (lead.firstName) parts.push(`Nombre: ${lead.firstName}`);
  if (lead.lastName) parts.push(`Apellido: ${lead.lastName}`);
  if (!lead.firstName && lead.contactPerson) parts.push(`Nombre completo: ${lead.contactPerson}`);
  if (lead.businessName) parts.push(`Negocio: ${lead.businessName}`);
  if (lead.contactTitle) parts.push(`Título: ${lead.contactTitle}`);
  if (lead.category) parts.push(`Categoría: ${lead.category}`);
  if (lead.industry) parts.push(`Industria: ${lead.industry}`);
  if (lead.city) parts.push(`Ciudad: ${lead.city}`);
  if (lead.state) parts.push(`Estado: ${lead.state}`);
  if (lead.email) parts.push(`Email: ${lead.email}`);
  if (lead.website) parts.push(`Website: ${lead.website}`);
  if (lead.rating) parts.push(`Rating: ${lead.rating}/5`);
  if (lead.followers) parts.push(`Seguidores: ${lead.followers}`);
  if (lead.bio) parts.push(`Bio: ${lead.bio}`);
  if (lead.profileUrl) parts.push(`Perfil: ${lead.profileUrl}`);
  return parts.join("\n");
}

/**
 * Generate a personalized message for a lead
 */
export async function generateMessage(
  request: GenerateMessageRequest,
  apiKey?: string
): Promise<GeneratedMessage> {
  const { channel, templateBase, lead, instructions, includeVideo, videoLink, videoTitle } = request;

  const systemPrompt = templateBase
    ? TEMPLATE_IMPROVEMENT_PROMPT
    : CHANNEL_SYSTEM_PROMPTS[channel] || CHANNEL_SYSTEM_PROMPTS.email;

  // Build user prompt
  const userPromptParts: string[] = [];

  if (templateBase) {
    userPromptParts.push(`TEMPLATE BASE:\n${templateBase}`);
    userPromptParts.push(`\nCANAL: ${channel}`);
  }

  userPromptParts.push(`\nDATOS DEL LEAD:\n${buildLeadContext(lead)}`);

  if (instructions) {
    userPromptParts.push(`\nINSTRUCCIONES ADICIONALES:\n${instructions}`);
  }

  if (includeVideo && videoLink) {
    userPromptParts.push(
      `\nVIDEO PERSONALIZADO:\nIncluye este video de forma natural en el mensaje.` +
      `\nLink: ${videoLink}` +
      (videoTitle ? `\nTítulo: ${videoTitle}` : "")
    );
  }

  if (channel === "linkedin") {
    userPromptParts.push(
      `\nIMPORTANTE: Genera DOS versiones:` +
      `\n1. "short": Nota de conexión (máximo 300 caracteres)` +
      `\n2. "long": Mensaje completo para InMail` +
      `\nFormato de respuesta:` +
      `\n[SHORT]\n(nota de conexión aquí)` +
      `\n[LONG]\n(mensaje completo aquí)`
    );
  }

  if (channel === "email") {
    userPromptParts.push(
      `\nIncluye un SUBJECT al inicio con el formato:` +
      `\n[SUBJECT]\n(asunto aquí)` +
      `\n[BODY]\n(mensaje aquí)`
    );
  }

  const userPrompt = userPromptParts.join("\n");

  // Generate with Claude
  const response = await generateWithClaude(systemPrompt, userPrompt, { apiKey });

  // Parse response
  return parseResponse(channel, response);
}

/**
 * Parse Claude's response based on channel format
 */
function parseResponse(channel: string, response: string): GeneratedMessage {
  const result: GeneratedMessage = {
    channel,
    messageLong: response.trim(),
    wordCount: response.split(/\s+/).length,
  };

  if (channel === "email") {
    const subjectMatch = response.match(/\[SUBJECT\]\s*([\s\S]*?)\[BODY\]/i);
    const bodyMatch = response.match(/\[BODY\]\s*([\s\S]*)/i);

    if (subjectMatch) result.subject = subjectMatch[1].trim();
    if (bodyMatch) {
      result.messageLong = bodyMatch[1].trim();
      result.wordCount = result.messageLong.split(/\s+/).length;
    }
  }

  if (channel === "linkedin") {
    const shortMatch = response.match(/\[SHORT\]\s*([\s\S]*?)\[LONG\]/i);
    const longMatch = response.match(/\[LONG\]\s*([\s\S]*)/i);

    if (shortMatch) {
      result.messageShort = shortMatch[1].trim().substring(0, 300);
    }
    if (longMatch) {
      result.messageLong = longMatch[1].trim();
      result.wordCount = result.messageLong.split(/\s+/).length;
    }
  }

  return result;
}

/**
 * Replace template placeholders with lead data
 */
export function replacePlaceholders(template: string, lead: LeadContext): string {
  const fullName = lead.contactPerson || [lead.firstName, lead.lastName].filter(Boolean).join(" ") || "";
  const firstName = lead.firstName || lead.contactPerson?.split(" ")[0] || "";
  const lastName = lead.lastName || "";

  const replacements: Record<string, string> = {
    "{{nombre}}": fullName || "allí",
    "{{nombre_pila}}": firstName || "allí",
    "{{apellido}}": lastName,
    "{{negocio}}": lead.businessName || "tu negocio",
    "{{ciudad}}": lead.city || "tu ciudad",
    "{{categoría}}": lead.category || "tu sector",
    "{{categoria}}": lead.category || "tu sector",
    "{{rating}}": lead.rating?.toString() || "",
    "{{website}}": lead.website || "",
    "{{email}}": lead.email || "",
    "{{titulo}}": lead.contactTitle || "",
    "{{bio}}": lead.bio || "",
    "{{seguidores}}": lead.followers?.toString() || "",
    "{{perfil}}": lead.profileUrl || "",
    "{{estado}}": lead.state || "",
    "{{industria}}": lead.industry || "tu industria",
    "{{linkedin}}": lead.linkedinUrl || "",
    "{{google_maps}}": lead.googleMapsUrl || "",
  };

  let result = template;
  for (const [placeholder, value] of Object.entries(replacements)) {
    result = result.replace(new RegExp(placeholder.replace(/[{}]/g, "\\$&"), "gi"), value);
  }

  return result;
}
