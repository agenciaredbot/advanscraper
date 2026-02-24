import Anthropic from "@anthropic-ai/sdk";

let clientInstance: Anthropic | null = null;

/**
 * Get or create the Anthropic client
 * Uses the API key from env or a user-provided key
 */
export function getClaudeClient(apiKey?: string): Anthropic {
  const key = apiKey || process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("Anthropic API key no configurada");

  // If using env key and we have a cached instance, reuse it
  if (!apiKey && clientInstance) return clientInstance;

  const client = new Anthropic({ apiKey: key });

  if (!apiKey) clientInstance = client;
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

  const client = getClaudeClient(apiKey);

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
