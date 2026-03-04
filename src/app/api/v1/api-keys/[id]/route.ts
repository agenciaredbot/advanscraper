import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { apiGuard, apiSuccess, apiError } from "../../_lib/response";

// DELETE — Revoke an API key
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await apiGuard(request);
  if (!guard.ok) return guard.response;

  try {
    const { id } = await params;

    const key = await prisma.apiKey.findFirst({
      where: { id, userId: guard.user.userId },
    });

    if (!key) {
      return apiError(
        { message: "API key no encontrada", code: "NOT_FOUND", statusCode: 404 },
        guard.rateLimit
      );
    }

    await prisma.apiKey.update({
      where: { id },
      data: { isActive: false },
    });

    return apiSuccess({ success: true, message: "API key revocada" }, { rateLimit: guard.rateLimit });
  } catch (error) {
    return apiError(error, guard.rateLimit);
  }
}
