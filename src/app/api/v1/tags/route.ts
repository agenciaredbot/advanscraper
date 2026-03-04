import { NextRequest } from "next/server";
import { listTags, createTag } from "@/lib/services/tags.service";
import { apiGuard, apiSuccess, apiError } from "../_lib/response";

// GET — List tags
export async function GET(request: NextRequest) {
  const guard = await apiGuard(request);
  if (!guard.ok) return guard.response;

  try {
    const tags = await listTags(guard.user.userId);
    return apiSuccess(tags, { rateLimit: guard.rateLimit });
  } catch (error) {
    return apiError(error, guard.rateLimit);
  }
}

// POST — Create tag
export async function POST(request: NextRequest) {
  const guard = await apiGuard(request);
  if (!guard.ok) return guard.response;

  try {
    const body = await request.json();
    const tag = await createTag(guard.user.userId, body);
    return apiSuccess(tag, { status: 201, rateLimit: guard.rateLimit });
  } catch (error) {
    return apiError(error, guard.rateLimit);
  }
}
