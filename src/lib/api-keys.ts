/**
 * System-level API Key management
 *
 * Resolution order for any key:
 *   1. User's own key (from Profile) — if they configured one
 *   2. System-level key (from SystemSetting table) — set by superadmin
 *   3. Environment variable fallback
 *
 * This allows the superadmin to provide API keys for all users,
 * while individual users can optionally override with their own.
 */

import { prisma } from "@/lib/db";

// ─── Known system keys ──────────────────────────────────────────────────────

export const SYSTEM_KEY_NAMES = {
  ANTHROPIC_API_KEY: "ANTHROPIC_API_KEY",
  BREVO_API_KEY: "BREVO_API_KEY",
  BREVO_SENDER_EMAIL: "BREVO_SENDER_EMAIL",
  BREVO_SENDER_NAME: "BREVO_SENDER_NAME",
  APIFY_API_TOKEN: "APIFY_API_TOKEN",
  PLAYWRIGHT_SERVICE_URL: "PLAYWRIGHT_SERVICE_URL",
  PLAYWRIGHT_SERVICE_API_KEY: "PLAYWRIGHT_SERVICE_API_KEY",
} as const;

export type SystemKeyName = (typeof SYSTEM_KEY_NAMES)[keyof typeof SYSTEM_KEY_NAMES];

// Human-readable metadata for the admin UI
export const SYSTEM_KEY_META: Record<
  SystemKeyName,
  { label: string; description: string; category: string }
> = {
  ANTHROPIC_API_KEY: {
    label: "Anthropic API Key",
    description: "Para generación de mensajes con IA (Claude)",
    category: "IA",
  },
  BREVO_API_KEY: {
    label: "Brevo API Key",
    description: "Para envío de emails masivos",
    category: "Email",
  },
  BREVO_SENDER_EMAIL: {
    label: "Brevo Sender Email",
    description: "Email remitente para campañas",
    category: "Email",
  },
  BREVO_SENDER_NAME: {
    label: "Brevo Sender Name",
    description: "Nombre del remitente para campañas",
    category: "Email",
  },
  APIFY_API_TOKEN: {
    label: "Apify API Token",
    description: "Para scraping premium (Google Maps, LinkedIn, Instagram)",
    category: "Scraping",
  },
  PLAYWRIGHT_SERVICE_URL: {
    label: "Playwright Service URL",
    description: "URL del microservicio de scraping nativo (Railway)",
    category: "Scraping",
  },
  PLAYWRIGHT_SERVICE_API_KEY: {
    label: "Playwright Service API Key",
    description: "Clave de autenticación del servicio Playwright",
    category: "Scraping",
  },
};

// ─── Read helpers ────────────────────────────────────────────────────────────

/**
 * Get a system-level setting value from the DB.
 * Returns null if not found.
 */
export async function getSystemSetting(key: string): Promise<string | null> {
  try {
    const setting = await prisma.systemSetting.findUnique({ where: { key } });
    return setting?.value ?? null;
  } catch {
    return null;
  }
}

/**
 * Get all system settings as a key-value map.
 */
export async function getAllSystemSettings(): Promise<Record<string, string>> {
  try {
    const settings = await prisma.systemSetting.findMany();
    const map: Record<string, string> = {};
    for (const s of settings) {
      map[s.key] = s.value;
    }
    return map;
  } catch {
    return {};
  }
}

/**
 * Set a system-level setting (upsert).
 */
export async function setSystemSetting(key: string, value: string): Promise<void> {
  await prisma.systemSetting.upsert({
    where: { key },
    update: { value },
    create: { key, value },
  });
}

/**
 * Delete a system-level setting.
 */
export async function deleteSystemSetting(key: string): Promise<void> {
  try {
    await prisma.systemSetting.delete({ where: { key } });
  } catch {
    // Ignore if not found
  }
}

// ─── Key resolution ─────────────────────────────────────────────────────────

/**
 * Resolve an API key with the priority chain:
 *   1. User override (if provided)
 *   2. System-level DB setting
 *   3. Environment variable
 *
 * @param systemKey - The key name (e.g. "ANTHROPIC_API_KEY")
 * @param userOverride - Optional user-provided value from their Profile
 * @returns The resolved key value, or null if none found
 */
export async function resolveApiKey(
  systemKey: SystemKeyName,
  userOverride?: string | null
): Promise<string | null> {
  // 1. User override
  if (userOverride && userOverride.trim()) return userOverride.trim();

  // 2. System-level DB setting
  const dbValue = await getSystemSetting(systemKey);
  if (dbValue && dbValue.trim()) return dbValue.trim();

  // 3. Environment variable fallback
  const envValue = process.env[systemKey];
  if (envValue && envValue.trim()) return envValue.trim();

  return null;
}

// ─── Seed from env vars ─────────────────────────────────────────────────────

/**
 * Auto-seed system settings from environment variables.
 * Only writes keys that don't already exist in the DB.
 * Called once on first admin load.
 */
export async function seedSystemKeysFromEnv(): Promise<{ seeded: number; skipped: number }> {
  const allKeys = Object.values(SYSTEM_KEY_NAMES);
  let seeded = 0;
  let skipped = 0;

  for (const key of allKeys) {
    const existing = await getSystemSetting(key);
    if (existing) {
      skipped++;
      continue;
    }

    const envValue = process.env[key];
    if (envValue && envValue.trim()) {
      await setSystemSetting(key, envValue.trim());
      seeded++;
    }
  }

  return { seeded, skipped };
}

// ─── Mask helper ────────────────────────────────────────────────────────────

/**
 * Mask a key for display (show first 6 + last 4 chars).
 */
export function maskApiKey(value: string): string {
  if (value.length <= 12) return "••••••••";
  return `${value.slice(0, 6)}${"•".repeat(8)}${value.slice(-4)}`;
}
