import { NextResponse } from "next/server";
import { addSlip, completeSession, getSession, isSlipFileUsed, isTransRefUsed, recordRejected } from "@/lib/store";
import { findStreamerById } from "@/lib/streamers";
import { accountMatches, getSlipVerifier, slipMode } from "@/lib/slip";
import { saveSlipFile } from "@/lib/uploads";

export const runtime = "nodejs";

const MAX_SIZE = 5 * 1024 * 1024;

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const session = await getSession(id);
  if (!session) return NextResponse.json({ message: "ไม่พบรายการนี้" }, { status: 404 });
  if (session.status === "EXPIRED") return NextResponse.json({ message: "QR หมดอายุแล้ว สร้างใหม่อีกครั้ง" }, { status: 410 });
  if (session.status === "SUCCESS") return NextResponse.json({ status: "SUCCESS" });

  const form = await req.formData().catch(() => null);
  if (!form) return NextResponse.json({ message: "ข้อมูลไม่ถูกต้อง" }, { status: 400 });
  const raw = form.get("slip");
  const file = raw instanceof File && raw.size > 0 ? raw : null;
  const mode = slipMode();
  // โหมด test ไม่บังคับแนบรูป (ใช้ข้อมูลที่กรอกแทน)
  if (!file && mode !== "test") return NextResponse.json({ message: "แนบรูปสลิปก่อนกดส่ง" }, { status: 400 });
  if (file && file.size > MAX_SIZE) return NextResponse.json({ message: "รูปใหญ่เกิน 5 MB" }, { status: 400 });
  if (file && !file.type.startsWith("image/")) return NextResponse.json({ message: "รองรับเฉพาะไฟล์รูปภาพ" }, { status: 400 });

  const streamer = await findStreamerById(session.recipientId);
  if (!streamer?.promptpayId) return NextResponse.json({ message: "สตรีมเมอร์ยังไม่ได้ตั้งค่าบัญชีรับเงิน" }, { status: 409 });

  // เก็บไฟล์ + บันทึกลง payment_slips
  const saved = file ? await saveSlipFile(file) : { storedPath: "(test-no-file)", hash: "", originalName: null };
  if (saved.hash && (await isSlipFileUsed(saved.hash))) {
    const slipId = await addSlip(session.dbId, saved);
    await recordRejected(slipId, mode, "DUPLICATE_FILE");
    return NextResponse.json({ message: "สลิปนี้ถูกใช้ไปแล้ว" }, { status: 409 });
  }
  const slipId = await addSlip(session.dbId, { ...saved, hash: saved.hash || "" });

  const result = await getSlipVerifier(session.amount, streamer.promptpayId).verify(file, form);
  if (!result.ok) {
    await recordRejected(slipId, mode, "UNREADABLE");
    return NextResponse.json({ message: result.reason }, { status: 422 });
  }
  const seen = { amount: result.amount, receiver: result.receiverAccount };

  // กันสลิปซ้ำ / ยอดไม่ตรง / โอนผิดบัญชี / สลิปเก่า
  if (await isTransRefUsed(result.transRef)) {
    await recordRejected(slipId, mode, "DUPLICATE_REF", seen);
    return NextResponse.json({ message: "สลิปนี้ถูกใช้ไปแล้ว" }, { status: 409 });
  }
  if (Math.abs(result.amount - session.amount) > 0.001) {
    await recordRejected(slipId, mode, "AMOUNT_MISMATCH", seen);
    return NextResponse.json({ message: `ยอดในสลิป (${result.amount} บาท) ไม่ตรงกับที่ระบุ (${session.amount} บาท)` }, { status: 422 });
  }
  if (!accountMatches(result.receiverAccount, streamer.promptpayId)) {
    await recordRejected(slipId, mode, "RECEIVER_MISMATCH", seen);
    return NextResponse.json({ message: "บัญชีผู้รับในสลิปไม่ใช่ของสตรีมเมอร์คนนี้" }, { status: 422 });
  }
  if (result.paidAt && new Date(result.paidAt).getTime() < session.createdAt - 60_000) {
    await recordRejected(slipId, mode, "OLD_SLIP", seen);
    return NextResponse.json({ message: "สลิปนี้โอนก่อนสร้างรายการ ใช้สลิปของรายการนี้เท่านั้น" }, { status: 422 });
  }

  const done = await completeSession(session, {
    slipId,
    provider: mode,
    transRef: result.transRef,
    amount: result.amount,
    receiver: result.receiverAccount,
  });
  if (done === "DUPLICATE") return NextResponse.json({ message: "สลิปนี้ถูกใช้ไปแล้ว" }, { status: 409 });
  if (!done) return NextResponse.json({ message: "รายการนี้ปิดไปแล้ว" }, { status: 409 });
  return NextResponse.json({ status: "SUCCESS" });
}
