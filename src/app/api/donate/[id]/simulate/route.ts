import { NextResponse } from "next/server";
import { completeSession, getSession } from "@/lib/store";
import { isMockSlip } from "@/lib/slip";

export const runtime = "nodejs";

/** ปุ่ม "จำลองการโอน" — ใช้ได้เฉพาะ SLIP_PROVIDER=mock */
export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!isMockSlip()) return NextResponse.json({ message: "ปิดใช้งาน" }, { status: 403 });
  const { id } = await ctx.params;
  const s = await getSession(id);
  const d = s && s.status === "PENDING" ? await completeSession(s, null) : null;
  if (!d || d === "DUPLICATE") return NextResponse.json({ message: "รายการนี้ปิดไปแล้ว" }, { status: 409 });
  return NextResponse.json({ status: "SUCCESS" });
}
