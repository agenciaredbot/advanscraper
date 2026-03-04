/**
 * API Key authentication for public API v1.
 * Validates `Authorization: Bearer ask_...` header.
 */

import { createHash } from "crypto";
import { prisma } from "@/lib/db";

export interface ApiKeyUser {
  userId: string;
  email: string;
  keyId: string;
  scopes: string[];
}

/**
 * Hash a raw API key to match against stored hashes.
 */
export function hashApiKey(rawKey: string): string {
  return createHash("sha256").update(rawKey).digest("hex");
}

/**
 * Generate a new API key with the `ask_` prefix.
 * Returns the raw key (shown once) and the hash (stored in DB).
 */
export function generateApiKey(): { rawKey: string; keyHash: string; keyPrefix: string } {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  const hex = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  const rawKey = `ask_${hex}`;
  const keyHash = hashApiKey(rawKey);
  const keyPrefix = rawKey.substring(0, 12) + "...";

  return { rawKey, keyHash, keyPrefix };
}

/**
 * Authenticate a request using the Authorization header.
 * Returns the authenticated user info or null.
 */
export async function authenticateApiKey(
  authHeader: string | null
): Promise<ApiKeyUser | null> {
  if (!authHeader) return null;

  // Expect "Bearer ask_..."
  const match = authHeader.match(/^Bearer\s+(ask_[a-f0-9]+)$/i);
  if (!match) return null;

  const rawKey = match[1];
  const keyHash = hashApiKey(rawKey);

  const apiKey = await prisma.apiKey.findUnique({
    where: { keyHash },
    select: {
      id: true,
      userId: true,
      scopes: true,
      isActive: true,
      expiresAt: true,
      user: { select: { email: true } },
    },
  });

  if (!apiKey) return null;
  if (!apiKey.isActive) return null;
  if (apiKey.expiresAt && apiKey.expiresAt < new Date()) return null;

  // Update last used timestamp (fire and forget)
  prisma.apiKey
    .update({
      where: { id: apiKey.id },
      data: { lastUsedAt: new Date() },
    })
    .catch(() => {});

  return {
    userId: apiKey.userId,
    email: apiKey.user?.email || "",
    keyId: apiKey.id,
    scopes: apiKey.scopes,
  };
}

/**
 * Helper to extract auth from a Request object.
 */
export async function getApiKeyUser(
  request: Request
): Promise<ApiKeyUser | null> {
  const authHeader = request.headers.get("authorization");
  return authenticateApiKey(authHeader);
}
