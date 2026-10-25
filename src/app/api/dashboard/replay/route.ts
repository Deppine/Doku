import { NextResponse } from "next/server";
import { currentUserId } from "@/lib/auth";
import { replayAlert } from "@/lib/store";
import { hit, isLimited } from "@/lib/rate-limit";

export const runtime = "nodejs";

/** เล่นแจ้งเตือนของโดเนทเดิมซ้ำบนจอ */
export async function POST(req: Request) {
  const userId = await currentUserId();
  if (!userId) return NextResponse.json({ message: "เข้าสู่ระบบก่อน" }, { status: 401 });
  const key = `replay:${userId}`;
  if (await isLimited(key, 20)) return NextResponse.json({ message: "เล่นซ้ำถี่เกินไป รอสักครู่" }, { status: 429 });
  const { ref } = (await req.json().catch(() => ({}))) as { ref?: unknown };
  if (typeof ref !== "string" || !ref) return NextResponse.json({ message: "ไม่พบรายการ" }, { status: 400 });
  await hit(key, 5 * 60_000);
  const ok = await replayAlert(userId, ref);
  if (!ok) return NextResponse.json({ message: "ไม่พบรายการนี้" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
