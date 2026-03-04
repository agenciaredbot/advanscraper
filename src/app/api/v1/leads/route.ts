import { NextRequest } from "next/server";
import { listLeads, createLead, createLeadsBulk } from "@/lib/services/leads.service";
import { apiGuard, apiSuccess, apiError } from "../_lib/response";

// GET — List leads
export async function GET(request: NextRequest) {
  const guard = await apiGuard(request);
  if (!guard.ok) return guard.response;

  try {
    const sp = request.nextUrl.searchParams;
    const result = await listLeads(
      guard.user.userId,
      {
        source: sp.get("source") || undefined,
        city: sp.get("city") || undefined,
        hasEmail: sp.get("hasEmail") === "true" ? true : undefined,
        hasPhone: sp.get("hasPhone") === "true" ? true : undefined,
        searchId: sp.get("searchId") || undefined,
        search: sp.get("search") || undefined,
        isSaved: sp.get("isSaved") === "true" ? true : sp.get("isSaved") === "false" ? false : undefined,
        tagId: sp.get("tagId") || undefined,
      },
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

// POST — Create lead(s)
export async function POST(request: NextRequest) {
  const guard = await apiGuard(request);
  if (!guard.ok) return guard.response;

  try {
    const body = await request.json();

    if (body.leads && Array.isArray(body.leads)) {
      const result = await createLeadsBulk(guard.user.userId, body.leads);
      return apiSuccess(result, { status: 201, rateLimit: guard.rateLimit });
    }

    const lead = await createLead(guard.user.userId, body);
    return apiSuccess(lead, { status: 201, rateLimit: guard.rateLimit });
  } catch (error) {
    return apiError(error, guard.rateLimit);
  }
}
