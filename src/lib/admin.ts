import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

/**
 * Verify the current user is an authenticated superadmin.
 * Returns { error, user, profile } — if error is non-null, return it as the response.
 */
export async function requireSuperadmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      error: NextResponse.json({ error: "No autorizado" }, { status: 401 }),
      user: null,
      profile: null,
    };
  }

  const profile = await prisma.profile.findUnique({
    where: { id: user.id },
  });

  if (!profile || profile.role !== "superadmin") {
    return {
      error: NextResponse.json({ error: "Acceso denegado" }, { status: 403 }),
      user: null,
      profile: null,
    };
  }

  return { error: null, user, profile };
}
