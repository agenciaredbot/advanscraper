/**
 * Brevo (formerly Sendinblue) email sending integration
 * Resolution: user key → system DB key → env var
 */

import { resolveApiKey, SYSTEM_KEY_NAMES } from "@/lib/api-keys";

interface SendEmailOptions {
  to: { email: string; name?: string };
  subject: string;
  htmlContent: string;
  textContent?: string;
  senderEmail?: string;
  senderName?: string;
}

interface SendEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Send a single email via Brevo API
 */
export async function sendEmailViaBrevo(
  options: SendEmailOptions,
  apiKey?: string
): Promise<SendEmailResult> {
  const key = await resolveApiKey(SYSTEM_KEY_NAMES.BREVO_API_KEY, apiKey);
  if (!key) throw new Error("Brevo API key no configurada");

  const senderEmail =
    options.senderEmail ||
    (await resolveApiKey(SYSTEM_KEY_NAMES.BREVO_SENDER_EMAIL)) ||
    undefined;
  const senderName =
    options.senderName ||
    (await resolveApiKey(SYSTEM_KEY_NAMES.BREVO_SENDER_NAME)) ||
    "LeadScraper Pro";

  if (!senderEmail) throw new Error("Sender email no configurado");

  try {
    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": key,
      },
      body: JSON.stringify({
        sender: { email: senderEmail, name: senderName },
        to: [{ email: options.to.email, name: options.to.name }],
        subject: options.subject,
        htmlContent: options.htmlContent,
        textContent: options.textContent,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      return {
        success: false,
        error: error.message || `HTTP ${response.status}`,
      };
    }

    const data = await response.json();
    return {
      success: true,
      messageId: data.messageId,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error sending email",
    };
  }
}

/**
 * Convert plain text message to basic HTML email
 */
export function textToHtml(text: string, options?: { videoLink?: string; videoTitle?: string }): string {
  let html = text
    .replace(/\n\n/g, "</p><p>")
    .replace(/\n/g, "<br>");

  html = `<div style="font-family: Arial, sans-serif; font-size: 14px; line-height: 1.6; color: #333;"><p>${html}</p>`;

  if (options?.videoLink) {
    html += `
      <div style="margin: 20px 0; text-align: center;">
        <a href="${options.videoLink}" style="display: inline-block; padding: 12px 24px; background: #10B981; color: white; text-decoration: none; border-radius: 8px; font-weight: bold;">
          ▶ ${options.videoTitle || "Ver Video Personalizado"}
        </a>
      </div>`;
  }

  html += "</div>";
  return html;
}
