import { NextResponse } from "next/server";
import QRCode from "qrcode";
import { findStreamer } from "@/lib/streamers";
import { buildPromptPayPayload } from "@/lib/promptpay";
import { createSession } from "@/lib/store";
import { MAX_DONATION, MAX_MESSAGE, baht } from "@/lib/format";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as {
    username?: string;
    donorName?: string;
    message?: string;
    amount?: number;
  } | null;
  if (!body) return NextResponse.json({ message: "ข้อมูลไม่ถูกต้อง" }, { status: 400 });

  const streamer = await findStreamer(body.username ?? "");
  if (!streamer) return NextResponse.json({ message: "ไม่พบสตรีมเมอร์" }, { status: 404 });
  if (!streamer.promptpayId) return NextResponse.json({ message: "สตรีมเมอร์ยังไม่ได้ตั้งค่าบัญชีรับเงิน" }, { status: 409 });

  const donorName = (body.donorName ?? "").trim().slice(0, 40) || "ไม่ระบุชื่อ";
  const message = (body.message ?? "").trim().slice(0, MAX_MESSAGE);
  // ปัดเป็นสตางค์ และบวกเศษสตางค์สุ่มได้ถ้าต้องการแยกรายการที่ยอดเท่ากัน
  const amount = Math.round(Number(body.amount) * 100) / 100;

  if (!Number.isFinite(amount) || amount < streamer.minAmount) {
    return NextResponse.json({ message: `โดเนทขั้นต่ำ ${streamer.minAmount} บาท` }, { status: 400 });
  }
  if (streamer.allowCustomAmount === false && !streamer.presets.includes(amount)) {
    return NextResponse.json({ message: "เลือกยอดจากปุ่มที่มีให้เท่านั้น" }, { status: 400 });
  }
  if (amount > MAX_DONATION) {
    return NextResponse.json({ message: `ยอดสูงสุดต่อครั้งคือ ${baht(MAX_DONATION)} บาท` }, { status: 400 });
  }

  const payload = buildPromptPayPayload(streamer.promptpayId, amount);
  const session = await createSession({ recipientId: streamer.id, donorName, message, amount, payload });
  const qr = await QRCode.toDataURL(payload, { margin: 1, width: 520, color: { dark: "#1d1d1f", light: "#ffffff" } });

  return NextResponse.json({
    id: session.id,
    amount: session.amount,
    expiresAt: session.expiresAt,
    qr,
  });
}
