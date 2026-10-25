import { NextResponse } from "next/server";
import { findStreamerByWidgetToken } from "@/lib/streamers";
import { getGoal } from "@/lib/streamer-stats";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** ความคืบหน้าเป้าหมาย สำหรับแถบเป้าหมายใน OBS (ยืนยันด้วย token ของวิดเจ็ต) */
export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get("token") ?? "";
  const s = await findStreamerByWidgetToken(token);
  if (!s) return NextResponse.json({ message: "invalid token" }, { status: 401 });
  const goal = await getGoal(s.id);
  return NextResponse.json({ goal }, { headers: { "Cache-Control": "no-store" } });
}
