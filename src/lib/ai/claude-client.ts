import Anthropic from "@anthropic-ai/sdk";
import { resolveApiKey, SYSTEM_KEY_NAMES } from "@/lib/api-keys";

let clientInstance: Anthropic | null = null;
let cachedKey: string | null = null;

/**
 * Get or create the Anthropic client.
 * Resolution: user key → system DB key → env var.
 */
export async function getClaudeClient(userApiKey?: string): Promise<Anthropic> {
  const key = await resolveApiKey(SYSTEM_KEY_NAMES.ANTHROPIC_API_KEY, userApiKey);
  if (!key) throw new Error("Anthropic API key no configurada");

  // Reuse cached instance if same key
  if (clientInstance && cachedKey === key) return clientInstance;

  const client = new Anthropic({ apiKey: key });
  clientInstance = client;
  cachedKey = key;
  return client;
}

/**
 * Send a message to Claude and get a response
 */
export async function generateWithClaude(
  systemPrompt: string,
  userMessage: string,
  options: {
    apiKey?: string;
    model?: string;
    maxTokens?: number;
  } = {}
): Promise<string> {
  const { apiKey, model = "claude-sonnet-4-20250514", maxTokens = 1024 } = options;

  const client = await getClaudeClient(apiKey);

  const message = await client.messages.create({
    model,
    max_tokens: maxTokens,
    system: systemPrompt,
    messages: [{ role: "user", content: userMessage }],
  });

  // Extract text from response
  const textBlock = message.content.find((block) => block.type === "text");
  return textBlock?.text || "";
}
