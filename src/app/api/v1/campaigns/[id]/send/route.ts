import { NextRequest } from "next/server";
import { sendCampaign } from "@/lib/services/campaigns.service";
import { apiGuard, apiSuccess, apiError } from "../../../_lib/response";

// POST — Send a campaign
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await apiGuard(request, "campaigns");
  if (!guard.ok) return guard.response;

  try {
    const { id } = await params;
    const result = await sendCampaign(
      guard.user.userId,
      guard.user.email,
      id
    );
    return apiSuccess(result, { rateLimit: guard.rateLimit });
  } catch (error) {
    return apiError(error, guard.rateLimit);
  }
}
