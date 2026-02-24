/**
 * WhatsApp outreach — Client for Python Playwright microservice
 *
 * The actual WhatsApp Web automation is done by a Flask microservice
 * running on port 5001 that uses Playwright to control WhatsApp Web.
 */

const WHATSAPP_SERVICE_URL =
  process.env.WHATSAPP_SERVICE_URL || "http://localhost:5001";

export interface WhatsAppStatus {
  connected: boolean;
  qrCode?: string;
  phone?: string;
}

export interface WhatsAppCampaignMessage {
  phone: string;
  message: string;
  leadName?: string;
}

/**
 * Check WhatsApp service status
 */
export async function getWhatsAppStatus(): Promise<WhatsAppStatus> {
  try {
    const res = await fetch(`${WHATSAPP_SERVICE_URL}/whatsapp/status`, {
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return { connected: false };
    return await res.json();
  } catch {
    return { connected: false };
  }
}

/**
 * Initialize WhatsApp session (generates QR)
 */
export async function initWhatsApp(): Promise<{ success: boolean; qrCode?: string; error?: string }> {
  try {
    const res = await fetch(`${WHATSAPP_SERVICE_URL}/whatsapp/init`, {
      method: "POST",
      signal: AbortSignal.timeout(30000),
    });
    return await res.json();
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Service unreachable" };
  }
}

/**
 * Get QR code image
 */
export async function getWhatsAppQR(): Promise<string | null> {
  try {
    const res = await fetch(`${WHATSAPP_SERVICE_URL}/whatsapp/qr`, {
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.qrCode || null;
  } catch {
    return null;
  }
}

/**
 * Send campaign messages via WhatsApp
 */
export async function sendWhatsAppCampaign(
  messages: WhatsAppCampaignMessage[]
): Promise<{ success: boolean; sent: number; failed: number; errors: string[] }> {
  try {
    const res = await fetch(`${WHATSAPP_SERVICE_URL}/whatsapp/send-campaign`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages }),
      signal: AbortSignal.timeout(messages.length * 60000), // 1 min per message max
    });

    if (!res.ok) {
      const error = await res.json().catch(() => ({}));
      return { success: false, sent: 0, failed: messages.length, errors: [error.error || "Failed"] };
    }

    return await res.json();
  } catch (error) {
    return {
      success: false,
      sent: 0,
      failed: messages.length,
      errors: [error instanceof Error ? error.message : "Service error"],
    };
  }
}

/**
 * Disconnect WhatsApp session
 */
export async function disconnectWhatsApp(): Promise<boolean> {
  try {
    const res = await fetch(`${WHATSAPP_SERVICE_URL}/whatsapp/disconnect`, {
      method: "POST",
      signal: AbortSignal.timeout(10000),
    });
    return res.ok;
  } catch {
    return false;
  }
}
