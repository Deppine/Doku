import { NextResponse } from "next/server";
import { addSlip, completeSession, getSession, isSlipFileUsed, isTransRefUsed, recordRejected } from "@/lib/store";
import { findStreamerById } from "@/lib/streamers";
import { accountMatches, getSlipVerifier, slipMode } from "@/lib/slip";
import { saveSlipFile } from "@/lib/uploads";
import { exec } from "@/lib/db";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_SIZE = 4 * 1024 * 1024; // Vercel รับ request ได้ไม่เกิน ~4.5 MB

/**
 * อุ่นเครื่องอ่านสลิป: หน้าโดเนทเรียกตอนโชว์ QR (ระหว่างผู้ชมกำลังโอนเงิน)
 * เซิร์ฟเวอร์จะโหลด OCR รอไว้ พอส่งสลิปจริงจะไม่ต้องเริ่มจากศูนย์
 */
export async function GET() {
  if (slipMode() === "local") {
    const { getWorker } = await import("@/lib/slip-local");
    await getWorker().catch(() => {});
  }
  return new Response(null, { status: 204, headers: { "Cache-Control": "no-store" } });
}

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const started = performance.now();
  const marks: string[] = [];
  const mark = (name: string, from: number) => marks.push(`${name};dur=${Math.round(performance.now() - from)}`);

  const { id } = await ctx.params;
  let t = performance.now();
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
  if (file && file.size > MAX_SIZE) return NextResponse.json({ message: "รูปใหญ่เกิน 4 MB" }, { status: 400 });
  if (file && !file.type.startsWith("image/")) return NextResponse.json({ message: "รองรับเฉพาะไฟล์รูปภาพ" }, { status: 400 });

  const streamer = await findStreamerById(session.recipientId);
  if (!streamer?.promptpayId) return NextResponse.json({ message: "สตรีมเมอร์ยังไม่ได้ตั้งค่าบัญชีรับเงิน" }, { status: 409 });
  mark("load", t);

  // อ่านสลิป และเก็บไฟล์ลงฐานข้อมูลไปพร้อมกัน (เดิมทำทีละอย่าง)
  let readMs = 0;
  t = performance.now();
  const [saved, result] = await Promise.all([
    (async () => {
      const r = file ? await saveSlipFile(file) : { storedPath: "(test-no-file)", hash: "", originalName: null };
      mark("save", t);
      return r;
    })(),
    (async () => {
      const r = await getSlipVerifier(session.amount, streamer.promptpayId!).verify(file, form);
      readMs = performance.now() - t;
      mark("read", t);
      return r;
    })(),
  ]);

  t = performance.now();
  const reply = (body: object, status = 200) => {
    mark("db", t);
    marks.push(`total;dur=${Math.round(performance.now() - started)}`);
    console.log(`[slip] ${id.slice(0, 8)} ${status} ${marks.join(" ")} region=${process.env.VERCEL_REGION ?? "local"}`);
    return NextResponse.json(body, { status, headers: { "Server-Timing": marks.join(", ") } });
  };

  if (saved.hash && (await isSlipFileUsed(saved.hash))) {
    const slipId = await addSlip(session.dbId, saved);
    await recordRejected(slipId, mode, "DUPLICATE_FILE");
    return reply({ message: "สลิปนี้ถูกใช้ไปแล้ว" }, 409);
  }
  const slipId = await addSlip(session.dbId, { ...saved, hash: saved.hash || "" });
  // เก็บเวลาที่ใช้อ่านสลิปไว้ทำค่าเฉลี่ยในหน้าผู้ดูแล
  await exec("UPDATE payment_slips SET check_ms = ? WHERE id = ?", [Math.round(readMs), slipId]).catch(() => {});

  if (!result.ok) {
    await recordRejected(slipId, mode, "UNREADABLE");
    return reply({ message: result.reason }, 422);
  }
  const seen = { amount: result.amount, receiver: result.receiverAccount };

  // กันสลิปซ้ำ / ยอดไม่ตรง / โอนผิดบัญชี / สลิปเก่า
  if (await isTransRefUsed(result.transRef)) {
    await recordRejected(slipId, mode, "DUPLICATE_REF", seen);
    return reply({ message: "สลิปนี้ถูกใช้ไปแล้ว" }, 409);
  }
  if (Math.abs(result.amount - session.amount) > 0.001) {
    await recordRejected(slipId, mode, "AMOUNT_MISMATCH", seen);
    return reply({ message: `ยอดในสลิป (${result.amount} บาท) ไม่ตรงกับที่ระบุ (${session.amount} บาท)` }, 422);
  }
  if (!accountMatches(result.receiverAccount, streamer.promptpayId)) {
    await recordRejected(slipId, mode, "RECEIVER_MISMATCH", seen);
    return reply({ message: "บัญชีผู้รับในสลิปไม่ใช่ของสตรีมเมอร์คนนี้" }, 422);
  }
  if (result.paidAt && new Date(result.paidAt).getTime() < session.createdAt - 60_000) {
    await recordRejected(slipId, mode, "OLD_SLIP", seen);
    return reply({ message: "สลิปนี้โอนก่อนสร้างรายการ ใช้สลิปของรายการนี้เท่านั้น" }, 422);
  }

  const done = await completeSession(session, {
    slipId,
    provider: mode,
    transRef: result.transRef,
    amount: result.amount,
    receiver: result.receiverAccount,
  });
  if (done === "DUPLICATE") return reply({ message: "สลิปนี้ถูกใช้ไปแล้ว" }, 409);
  if (!done) return reply({ message: "รายการนี้ปิดไปแล้ว" }, 409);
  return reply({ status: "SUCCESS" });
}
