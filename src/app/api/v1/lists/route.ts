import { NextRequest } from "next/server";
import { listLeadLists, createLeadList } from "@/lib/services/lists.service";
import { apiGuard, apiSuccess, apiError } from "../_lib/response";

// GET — List all lead lists
export async function GET(request: NextRequest) {
  const guard = await apiGuard(request);
  if (!guard.ok) return guard.response;

  try {
    const lists = await listLeadLists(guard.user.userId);
    return apiSuccess(lists, { rateLimit: guard.rateLimit });
  } catch (error) {
    return apiError(error, guard.rateLimit);
  }
}

// POST — Create list
export async function POST(request: NextRequest) {
  const guard = await apiGuard(request);
  if (!guard.ok) return guard.response;

  try {
    const body = await request.json();
    const list = await createLeadList(guard.user.userId, body);
    return apiSuccess(list, { status: 201, rateLimit: guard.rateLimit });
  } catch (error) {
    return apiError(error, guard.rateLimit);
  }
}
