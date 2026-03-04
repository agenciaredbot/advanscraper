import { NextRequest } from "next/server";
import { listOutreachLogs } from "@/lib/services/outreach.service";
import { apiGuard, apiSuccess, apiError } from "../_lib/response";

// GET — List outreach history
export async function GET(request: NextRequest) {
  const guard = await apiGuard(request);
  if (!guard.ok) return guard.response;

  try {
    const sp = request.nextUrl.searchParams;
    const result = await listOutreachLogs(
      guard.user.userId,
      { channel: sp.get("channel") || undefined },
      {
        page: parseInt(sp.get("page") || "1", 10),
        limit: parseInt(sp.get("limit") || "20", 10),
      }
    );

    return apiSuccess(result.data, {
      meta: { pagination: result.pagination },
      rateLimit: guard.rateLimit,
    });
  } catch (error) {
    return apiError(error, guard.rateLimit);
  }
}
