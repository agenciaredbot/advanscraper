/**
 * MCP Server Authentication.
 * Authenticates the agent via API key passed as environment variable.
 */

import { authenticateApiKey, type ApiKeyUser } from "@/app/api/v1/_lib/auth";

let cachedUser: ApiKeyUser | null = null;

/**
 * Get the authenticated user for MCP operations.
 * Reads the API key from the ADVANSCRAPER_API_KEY environment variable.
 */
export async function getMcpUser(): Promise<ApiKeyUser> {
  if (cachedUser) return cachedUser;

  const apiKey = process.env.ADVANSCRAPER_API_KEY;
  if (!apiKey) {
    throw new Error(
      "ADVANSCRAPER_API_KEY environment variable is required. " +
        "Generate one in Settings > API Publica."
    );
  }

  const user = await authenticateApiKey(`Bearer ${apiKey}`);
  if (!user) {
    throw new Error(
      "Invalid or expired ADVANSCRAPER_API_KEY. " +
        "Generate a new one in Settings > API Publica."
    );
  }

  cachedUser = user;
  return user;
}
