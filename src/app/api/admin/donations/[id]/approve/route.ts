import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { approveManually } from "@/lib/store";

export const runtime = "nodejs";

const MSG = {
  NOT_FOUND: ["ไม่พบรายการนี้", 404],
  ALREADY: ["รายการนี้ผ่านไปแล้ว", 409],
  NO_SLIP: ["รายการนี้ยังไม่มีสลิป อนุมัติไม่ได้", 409],
} as const;

/** ผู้ดูแลอนุมัติรายการเอง หลังเปิดดูสลิปแล้วยืนยันว่าเงินเข้าจริง */
export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const me = await currentUser();
  if (me?.role !== "admin") return NextResponse.json({ message: "เฉพาะผู้ดูแลเท่านั้น" }, { status: 403 });
  const id = Number((await ctx.params).id);
  if (!Number.isInteger(id) || id <= 0) return NextResponse.json({ message: "รายการไม่ถูกต้อง" }, { status: 400 });
  const r = await approveManually(id, me.id);
  if (r !== "OK") return NextResponse.json({ message: MSG[r][0] }, { status: MSG[r][1] });
  return NextResponse.json({ ok: true });
}
