import { NextRequest } from "next/server";
import { getCampaign, deleteCampaign } from "@/lib/services/campaigns.service";
import { apiGuard, apiSuccess, apiError } from "../../_lib/response";

// GET — Get campaign detail
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await apiGuard(request, "campaigns");
  if (!guard.ok) return guard.response;

  try {
    const { id } = await params;
    const campaign = await getCampaign(guard.user.userId, id);
    return apiSuccess(campaign, { rateLimit: guard.rateLimit });
  } catch (error) {
    return apiError(error, guard.rateLimit);
  }
}

// DELETE — Delete campaign
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await apiGuard(request, "campaigns");
  if (!guard.ok) return guard.response;

  try {
    const { id } = await params;
    const result = await deleteCampaign(guard.user.userId, id);
    return apiSuccess(result, { rateLimit: guard.rateLimit });
  } catch (error) {
    return apiError(error, guard.rateLimit);
  }
}
