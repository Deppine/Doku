import { NextResponse } from "next/server";
import { currentUserId } from "@/lib/auth";
import { getSoundSettings, saveSoundSettings, toClient, widgetSoundUrl } from "@/lib/alert-settings";
import { imageExt, imageType, readUpload, removeUpload, saveImageFile } from "@/lib/uploads";
import { findStreamerById } from "@/lib/streamers";
import { emitSettings } from "@/lib/store";

export const runtime = "nodejs";

// OBS โหลดรูปตอนมีโดเนท ไฟล์ใหญ่จะขึ้นช้า · ฐานข้อมูลเก็บได้ไม่เกิน 16 MB ต่อไฟล์อยู่แล้ว
const MAX = 3 * 1024 * 1024; // 3 MB

async function broadcast(userId: number) {
  const [s, st] = await Promise.all([findStreamerById(userId), getSoundSettings(userId)]);
  if (s) await emitSettings(userId, toClient(st, widgetSoundUrl(s.widgetToken, st.soundFile), s.widgetToken));
}

/** ดูรูปของตัวเองในแดชบอร์ด */
export async function GET() {
  const userId = await currentUserId();
  if (!userId) return new Response("unauthorized", { status: 401 });
  const st = await getSoundSettings(userId);
  if (!st.alertImage) return new Response("not found", { status: 404 });
  const buf = await readUpload(st.alertImage).catch(() => null);
  if (!buf) return new Response("not found", { status: 404 });
  return new Response(new Uint8Array(buf), { headers: { "Content-Type": imageType(st.alertImage), "Cache-Control": "private, max-age=86400" } });
}

/** อัปโหลดรูป/GIF (แทนที่รูปเดิม) */
export async function POST(req: Request) {
  const userId = await currentUserId();
  if (!userId) return NextResponse.json({ message: "เข้าสู่ระบบก่อน" }, { status: 401 });
  const form = await req.formData().catch(() => null);
  const file = form?.get("image");
  if (!(file instanceof File) || file.size === 0) return NextResponse.json({ message: "เลือกรูปก่อน" }, { status: 400 });
  if (file.size > MAX) return NextResponse.json({ message: "ไฟล์ใหญ่เกิน 3 MB ลองย่อขนาดหรือลดจำนวนเฟรมของ GIF" }, { status: 400 });
  if (!imageExt(file.type)) return NextResponse.json({ message: "รองรับ GIF, PNG, JPG, WEBP" }, { status: 400 });

  const cur = await getSoundSettings(userId);
  const rel = await saveImageFile(userId, file);
  try {
    await saveSoundSettings(userId, { ...cur, alertImage: rel, alertSticker: null }); // อัปโหลดรูปใหม่ = ใช้รูปนี้แทนสติกเกอร์
  } catch (e) {
    await removeUpload(rel).catch(() => {});
    return NextResponse.json({ message: (e as Error).message }, { status: 500 });
  }
  // บันทึกไม่ลงคอลัมน์ (ยังไม่ได้รัน migration 010) → ไม่เก็บไฟล์ไว้เปล่า ๆ
  const saved = await getSoundSettings(userId);
  if (saved.alertImage !== rel) {
    await removeUpload(rel).catch(() => {});
    return NextResponse.json({ message: "ฐานข้อมูลยังไม่รองรับรูปแจ้งเตือน ให้รัน npm run db:migrate แล้วลองใหม่" }, { status: 500 });
  }
  if (cur.alertImage) await removeUpload(cur.alertImage).catch(() => {});
  await broadcast(userId);
  return NextResponse.json({ ok: true, url: toClient(saved, null).alertImageUrl });
}

export async function DELETE() {
  const userId = await currentUserId();
  if (!userId) return NextResponse.json({ message: "เข้าสู่ระบบก่อน" }, { status: 401 });
  const cur = await getSoundSettings(userId);
  if (cur.alertImage) await removeUpload(cur.alertImage).catch(() => {});
  await saveSoundSettings(userId, { ...cur, alertImage: null });
  await broadcast(userId);
  return NextResponse.json({ ok: true });
}
