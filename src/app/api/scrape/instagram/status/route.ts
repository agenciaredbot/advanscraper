import { NextResponse } from "next/server";
import { checkInstagramService } from "@/lib/scrapers/instagram";

export async function GET() {
  const online = await checkInstagramService();
  return NextResponse.json({ online });
}
