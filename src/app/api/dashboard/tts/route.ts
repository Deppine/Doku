import { NextResponse } from "next/server";
import { currentUserId } from "@/lib/auth";
import { ttsResponse } from "@/lib/tts-response";

export const runtime = "nodejs";

/** ฟังตัวอย่างเสียงอ่านในแดชบอร์ด */
export async function POST(req: Request) {
  const userId = await currentUserId();
  if (!userId) return NextResponse.json({ message: "เข้าสู่ระบบก่อน" }, { status: 401 });
  return ttsResponse(req, `tts:d:${userId}`, 30); // 30 ครั้ง / 10 นาที
}
