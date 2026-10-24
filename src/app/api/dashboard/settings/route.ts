import { NextResponse } from "next/server";
import { MAX_DONATION } from "@/lib/format";
import { updateStreamer } from "@/lib/streamers";
import { currentUserId } from "@/lib/auth";
import { validatePromptPayId } from "@/lib/promptpay";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const userId = await currentUserId();
  if (!userId) return NextResponse.json({ message: "เซสชันหมดอายุ เข้าสู่ระบบใหม่อีกครั้ง" }, { status: 401 });
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ message: "ข้อมูลไม่ถูกต้อง" }, { status: 400 });

  const pp = validatePromptPayId(String(body.promptpayId ?? ""));
  if (!pp.ok) return NextResponse.json({ field: "promptpayId", message: pp.message }, { status: 400 });

  const promptpayName = String(body.promptpayName ?? "").trim().slice(0, 80);
  if (!promptpayName) return NextResponse.json({ field: "promptpayName", message: "ใส่ชื่อบัญชีให้ตรงกับในแอปธนาคาร" }, { status: 400 });

  const displayName = String(body.displayName ?? "").trim().slice(0, 40);
  if (!displayName) return NextResponse.json({ field: "displayName", message: "ใส่ชื่อที่แสดง" }, { status: 400 });

  const minAmount = Math.floor(Number(body.minAmount));
  if (!Number.isFinite(minAmount) || minAmount < 1 || minAmount > 10_000) {
    return NextResponse.json({ field: "minAmount", message: "ยอดขั้นต่ำต้องอยู่ระหว่าง 1–10,000 บาท" }, { status: 400 });
  }

  const presets = String(body.presets ?? "")
    .split(/[,\s]+/)
    .map((n) => Math.floor(Number(n)))
    .filter((n) => Number.isFinite(n) && n >= minAmount && n <= MAX_DONATION);
  const uniq = [...new Set(presets)].sort((a, b) => a - b).slice(0, 5);
  if (uniq.length < 1) {
    return NextResponse.json({ field: "presets", message: `ใส่ปุ่มยอดอย่างน้อย 1 ค่า และไม่ต่ำกว่า ${minAmount} บาท` }, { status: 400 });
  }

  const updated = await updateStreamer(userId, {
    displayName,
    bio: String(body.bio ?? "").trim().slice(0, 160),
    promptpayId: pp.value,
    promptpayName,
    minAmount,
    presets: uniq,
    allowCustomAmount: body.allowCustomAmount !== false,
  });
  return NextResponse.json({ ok: true, presets: updated?.presets });
}
