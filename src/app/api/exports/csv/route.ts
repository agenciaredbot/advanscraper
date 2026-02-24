import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/db";
import { generateCSV } from "@/lib/exports/csv-generator";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const body = await request.json();
    const { leadIds, searchId, source } = body;

    // Build where clause
    const where: Record<string, unknown> = { userId: user.id };
    if (leadIds && leadIds.length > 0) {
      where.id = { in: leadIds };
    }
    if (searchId) where.searchId = searchId;
    if (source) where.source = source;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const leads = await prisma.lead.findMany({
      where: where as any,
      orderBy: { scrapedAt: "desc" },
    });

    if (leads.length === 0) {
      return NextResponse.json(
        { error: "No hay leads para exportar" },
        { status: 400 }
      );
    }

    const csv = generateCSV(leads);
    const fileName = `leads-export-${new Date().toISOString().split("T")[0]}.csv`;

    // Log export
    await prisma.export.create({
      data: {
        userId: user.id,
        searchId: searchId || null,
        exportType: "csv",
        fileName,
        totalLeads: leads.length,
      },
    });

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${fileName}"`,
      },
    });
  } catch (error) {
    console.error("CSV export error:", error);
    return NextResponse.json(
      { error: "Error al exportar" },
      { status: 500 }
    );
  }
}
