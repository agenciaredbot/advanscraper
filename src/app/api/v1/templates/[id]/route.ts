import { NextRequest } from "next/server";
import { getTemplate, updateTemplate, deleteTemplate } from "@/lib/services/templates.service";
import { apiGuard, apiSuccess, apiError } from "../../_lib/response";

// GET — Get template
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await apiGuard(request);
  if (!guard.ok) return guard.response;

  try {
    const { id } = await params;
    const template = await getTemplate(guard.user.userId, id);
    return apiSuccess(template, { rateLimit: guard.rateLimit });
  } catch (error) {
    return apiError(error, guard.rateLimit);
  }
}

// PATCH — Update template
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await apiGuard(request);
  if (!guard.ok) return guard.response;

  try {
    const { id } = await params;
    const body = await request.json();
    const template = await updateTemplate(guard.user.userId, id, body);
    return apiSuccess(template, { rateLimit: guard.rateLimit });
  } catch (error) {
    return apiError(error, guard.rateLimit);
  }
}

// DELETE — Delete template
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await apiGuard(request);
  if (!guard.ok) return guard.response;

  try {
    const { id } = await params;
    const result = await deleteTemplate(guard.user.userId, id);
    return apiSuccess(result, { rateLimit: guard.rateLimit });
  } catch (error) {
    return apiError(error, guard.rateLimit);
  }
}
