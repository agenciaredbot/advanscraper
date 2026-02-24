import { NextRequest, NextResponse } from "next/server";
import { requireSuperadmin } from "@/lib/admin";
import { prisma } from "@/lib/db";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireSuperadmin();
  if (error) return error;

  const { id } = await params;

  const user = await prisma.profile.findUnique({
    where: { id },
    include: {
      _count: {
        select: {
          leads: true,
          searches: true,
          campaigns: true,
          outreachLogs: true,
          exports: true,
          templates: true,
          leadLists: true,
          loomVideos: true,
        },
      },
    },
  });

  if (!user) {
    return NextResponse.json(
      { error: "Usuario no encontrado" },
      { status: 404 }
    );
  }

  return NextResponse.json({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    isActive: user.isActive,
    dailyLimit: user.dailyLimit,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    hasBrevoKey: !!user.brevoApiKey,
    hasApifyToken: !!user.apifyApiToken,
    hasAnthropicKey: !!user.anthropicApiKey,
    hasSendsparkKey: !!user.sendsparkApiKey,
    _count: user._count,
  });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, profile: adminProfile } = await requireSuperadmin();
  if (error) return error;

  const { id } = await params;
  const body = await request.json();

  // Prevent superadmin from demoting themselves
  if (id === adminProfile!.id && body.role && body.role !== "superadmin") {
    return NextResponse.json(
      { error: "No puedes cambiar tu propio rol" },
      { status: 400 }
    );
  }

  // Prevent superadmin from disabling themselves
  if (id === adminProfile!.id && body.isActive === false) {
    return NextResponse.json(
      { error: "No puedes desactivar tu propia cuenta" },
      { status: 400 }
    );
  }

  const updateData: Record<string, unknown> = {};
  if (body.name !== undefined) updateData.name = body.name;
  if (body.dailyLimit !== undefined)
    updateData.dailyLimit = Number(body.dailyLimit);
  if (
    body.role !== undefined &&
    ["user", "superadmin"].includes(body.role)
  ) {
    updateData.role = body.role;
  }
  if (body.isActive !== undefined)
    updateData.isActive = Boolean(body.isActive);

  try {
    const updated = await prisma.profile.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      user: {
        id: updated.id,
        name: updated.name,
        role: updated.role,
        isActive: updated.isActive,
        dailyLimit: updated.dailyLimit,
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Usuario no encontrado" },
      { status: 404 }
    );
  }
}
