import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { currentUserId } from "@/lib/auth";
import { emitAlert, listenerCount } from "@/lib/store";

export const runtime = "nodejs";

export async function POST() {
  const userId = await currentUserId();
  if (!userId) return NextResponse.json({ message: "เข้าสู่ระบบก่อน" }, { status: 401 });

  const online = listenerCount(userId);
  emitAlert(userId, {
    type: "donation",
    id: randomUUID(),
    donorName: "ทดสอบระบบ",
    message: "นี่คือข้อความทดสอบ ถ้าเห็นบนจอแปลว่าตั้งค่าเรียบร้อย",
    amount: 100,
    test: true,
  });
  return NextResponse.json({ online });
}
