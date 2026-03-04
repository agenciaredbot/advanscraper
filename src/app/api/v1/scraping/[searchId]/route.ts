import { NextRequest } from "next/server";
import { checkScrapeStatus } from "@/lib/services/scraping.service";
import { apiGuard, apiSuccess, apiError } from "../../_lib/response";

// GET — Check scrape status
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ searchId: string }> }
) {
  const guard = await apiGuard(request, "scraping");
  if (!guard.ok) return guard.response;

  try {
    const { searchId } = await params;
    const result = await checkScrapeStatus(
      guard.user.userId,
      guard.user.email,
      searchId
    );
    return apiSuccess(result, { rateLimit: guard.rateLimit });
  } catch (error) {
    return apiError(error, guard.rateLimit);
  }
}
