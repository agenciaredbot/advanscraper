import { NextRequest, NextResponse } from "next/server";
import { exportLeadsCSV } from "@/lib/services/exports.service";
import { apiGuard, apiError } from "../../_lib/response";

// POST — Export leads to CSV
export async function POST(request: NextRequest) {
  const guard = await apiGuard(request);
  if (!guard.ok) return guard.response;

  try {
    const body = await request.json();
    const { csv, fileName } = await exportLeadsCSV(guard.user.userId, body);

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${fileName}"`,
      },
    });
  } catch (error) {
    return apiError(error, guard.rateLimit);
  }
}
