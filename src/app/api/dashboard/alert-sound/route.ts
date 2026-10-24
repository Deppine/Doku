import { NextResponse } from "next/server";
import { currentUserId } from "@/lib/auth";
import { getSoundSettings, saveSoundSettings, toClient, widgetSoundUrl } from "@/lib/alert-settings";
import { audioExt, readUpload, removeUpload, saveSoundFile } from "@/lib/uploads";
import { findStreamerById } from "@/lib/streamers";
import { emitSettings } from "@/lib/store";

export const runtime = "nodejs";

const MAX = 1024 * 1024; // 1 MB

async function broadcast(userId: number) {
  const [s, st] = await Promise.all([findStreamerById(userId), getSoundSettings(userId)]);
  if (s) await emitSettings(userId, toClient(st, widgetSoundUrl(s.widgetToken, st.soundFile), s.widgetToken));
}

/** ฟังไฟล์เสียงของตัวเองในแดชบอร์ด */
export async function GET() {
  const userId = await currentUserId();
  if (!userId) return new Response("unauthorized", { status: 401 });
  const st = await getSoundSettings(userId);
  if (!st.soundFile) return new Response("not found", { status: 404 });
  const buf = await readUpload(st.soundFile).catch(() => null);
  if (!buf) return new Response("not found", { status: 404 });
  return new Response(new Uint8Array(buf), { headers: { "Content-Type": typeFor(st.soundFile), "Cache-Control": "private, no-store" } });
}

/** อัปโหลดเสียงของตัวเอง (แทนที่ไฟล์เดิม) แล้วตั้งให้ใช้ทันที */
export async function POST(req: Request) {
  const userId = await currentUserId();
  if (!userId) return NextResponse.json({ message: "เข้าสู่ระบบก่อน" }, { status: 401 });
  const form = await req.formData().catch(() => null);
  const file = form?.get("sound");
  if (!(file instanceof File) || file.size === 0) return NextResponse.json({ message: "เลือกไฟล์เสียงก่อน" }, { status: 400 });
  if (file.size > MAX) return NextResponse.json({ message: "ไฟล์ใหญ่เกิน 1 MB ตัดเสียงให้สั้นลง (ไม่เกิน 10 วินาที)" }, { status: 400 });
  if (!audioExt(file.type)) return NextResponse.json({ message: "รองรับ MP3, WAV, OGG, M4A" }, { status: 400 });

  const cur = await getSoundSettings(userId);
  const rel = await saveSoundFile(userId, file);
  if (cur.soundFile) await removeUpload(cur.soundFile).catch(() => {});
  try {
    await saveSoundSettings(userId, { ...cur, soundFile: rel, soundPreset: "custom" });
  } catch (e) {
    await removeUpload(rel).catch(() => {});
    return NextResponse.json({ message: (e as Error).message }, { status: 500 });
  }
  await broadcast(userId);
  return NextResponse.json({ ok: true, name: file.name });
}

export async function DELETE() {
  const userId = await currentUserId();
  if (!userId) return NextResponse.json({ message: "เข้าสู่ระบบก่อน" }, { status: 401 });
  const cur = await getSoundSettings(userId);
  if (cur.soundFile) await removeUpload(cur.soundFile).catch(() => {});
  await saveSoundSettings(userId, { ...cur, soundFile: null, soundPreset: cur.soundPreset === "custom" ? "chime" : cur.soundPreset });
  await broadcast(userId);
  return NextResponse.json({ ok: true });
}

function typeFor(p: string) {
  const ext = p.split(".").pop();
  return ext === "wav" ? "audio/wav" : ext === "ogg" ? "audio/ogg" : ext === "webm" ? "audio/webm" : ext === "m4a" ? "audio/mp4" : ext === "aac" ? "audio/aac" : "audio/mpeg";
}
