import { NextRequest } from "next/server";
import { generateAIMessage } from "@/lib/services/ai.service";
import { apiGuard, apiSuccess, apiError } from "../../_lib/response";

// POST — Generate a personalized message
export async function POST(request: NextRequest) {
  const guard = await apiGuard(request, "ai");
  if (!guard.ok) return guard.response;

  try {
    const body = await request.json();
    const result = await generateAIMessage(
      guard.user.userId,
      guard.user.email,
      body
    );
    return apiSuccess(result, { rateLimit: guard.rateLimit });
  } catch (error) {
    return apiError(error, guard.rateLimit);
  }
}
