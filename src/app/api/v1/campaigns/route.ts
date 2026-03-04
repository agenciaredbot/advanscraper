import { NextRequest } from "next/server";
import { listCampaigns, createCampaign } from "@/lib/services/campaigns.service";
import { apiGuard, apiSuccess, apiError } from "../_lib/response";

// GET — List campaigns
export async function GET(request: NextRequest) {
  const guard = await apiGuard(request, "campaigns");
  if (!guard.ok) return guard.response;

  try {
    const campaigns = await listCampaigns(guard.user.userId);
    return apiSuccess(campaigns, { rateLimit: guard.rateLimit });
  } catch (error) {
    return apiError(error, guard.rateLimit);
  }
}

// POST — Create campaign
export async function POST(request: NextRequest) {
  const guard = await apiGuard(request, "campaigns");
  if (!guard.ok) return guard.response;

  try {
    const body = await request.json();
    const campaign = await createCampaign(guard.user.userId, body);
    return apiSuccess(campaign, { status: 201, rateLimit: guard.rateLimit });
  } catch (error) {
    return apiError(error, guard.rateLimit);
  }
}
