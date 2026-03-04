import { NextRequest } from "next/server";
import { listTemplates, createTemplate } from "@/lib/services/templates.service";
import { apiGuard, apiSuccess, apiError } from "../_lib/response";

// GET — List templates
export async function GET(request: NextRequest) {
  const guard = await apiGuard(request);
  if (!guard.ok) return guard.response;

  try {
    const templates = await listTemplates(guard.user.userId);
    return apiSuccess(templates, { rateLimit: guard.rateLimit });
  } catch (error) {
    return apiError(error, guard.rateLimit);
  }
}

// POST — Create template
export async function POST(request: NextRequest) {
  const guard = await apiGuard(request);
  if (!guard.ok) return guard.response;

  try {
    const body = await request.json();
    const template = await createTemplate(guard.user.userId, body);
    return apiSuccess(template, { status: 201, rateLimit: guard.rateLimit });
  } catch (error) {
    return apiError(error, guard.rateLimit);
  }
}
