import { NextRequest } from "next/server";
import { getDashboardStats } from "@/lib/services/stats.service";
import { apiGuard, apiSuccess, apiError } from "../_lib/response";

// GET — Dashboard statistics
export async function GET(request: NextRequest) {
  const guard = await apiGuard(request);
  if (!guard.ok) return guard.response;

  try {
    const stats = await getDashboardStats(guard.user.userId);
    return apiSuccess(stats, { rateLimit: guard.rateLimit });
  } catch (error) {
    return apiError(error, guard.rateLimit);
  }
}
