import { NextResponse } from "next/server";
import { currentUserId } from "@/lib/auth";
import { deleteGoal, isGoalStyle, saveGoal, setGoalStyle } from "@/lib/streamer-stats";
import { MAX_DONATION } from "@/lib/format";

export const runtime = "nodejs";

/** ตั้ง/แก้เป้าหมายโดเนท { title, target, reset } · เปลี่ยนแค่หน้าตาหลอด { style } */
export async function POST(req: Request) {
  const userId = await currentUserId();
  if (!userId) return NextResponse.json({ message: "เข้าสู่ระบบก่อน" }, { status: 401 });
  const b = (await req.json().catch(() => ({}))) as { title?: unknown; target?: unknown; reset?: unknown; style?: unknown };
  if (b.title === undefined && b.style !== undefined) {
    if (!isGoalStyle(b.style)) return NextResponse.json({ message: "ไม่รู้จักแบบนี้" }, { status: 400 });
    if (!(await setGoalStyle(userId, b.style))) {
      return NextResponse.json({ message: "บันทึกไม่ได้ ให้รัน npm run db:migrate ก่อน" }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  }
  const title = String(b.title ?? "").trim().slice(0, 80);
  const target = Math.round(Number(b.target));
  if (!title) return NextResponse.json({ field: "title", message: "ใส่ชื่อเป้าหมาย" }, { status: 400 });
  if (!Number.isFinite(target) || target < 1 || target > MAX_DONATION * 10) {
    return NextResponse.json({ field: "target", message: "ยอดเป้าหมายต้องมากกว่า 0" }, { status: 400 });
  }
  try {
    await saveGoal(userId, title, target, Boolean(b.reset));
  } catch {
    return NextResponse.json({ message: "บันทึกไม่ได้ ให้รัน npm run db:migrate ก่อน" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  const userId = await currentUserId();
  if (!userId) return NextResponse.json({ message: "เข้าสู่ระบบก่อน" }, { status: 401 });
  await deleteGoal(userId).catch(() => {});
  return NextResponse.json({ ok: true });
}
