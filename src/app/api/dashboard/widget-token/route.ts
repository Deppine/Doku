import { NextResponse } from "next/server";
import { currentUserId } from "@/lib/auth";
import { regenerateWidgetToken } from "@/lib/streamers";

export const runtime = "nodejs";

/** สร้างลิงก์ widget ใหม่ (ลิงก์เก่าใช้ไม่ได้ทันที) */
export async function POST() {
  const userId = await currentUserId();
  if (!userId) return NextResponse.json({ message: "เข้าสู่ระบบก่อน" }, { status: 401 });
  await regenerateWidgetToken(userId);
  return NextResponse.json({ ok: true });
}
