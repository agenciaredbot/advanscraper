import { NextRequest } from "next/server";
import { generateAIMessagesBulk } from "@/lib/services/ai.service";
import { apiGuard, apiSuccess, apiError } from "../../../_lib/response";

// POST — Generate messages in bulk
export async function POST(request: NextRequest) {
  const guard = await apiGuard(request, "ai");
  if (!guard.ok) return guard.response;

  try {
    const body = await request.json();
    const results = await generateAIMessagesBulk(
      guard.user.userId,
      guard.user.email,
      body
    );
    return apiSuccess(results, { rateLimit: guard.rateLimit });
  } catch (error) {
    return apiError(error, guard.rateLimit);
  }
}
