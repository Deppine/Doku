import { NextResponse } from "next/server";
import { cleanText, synthesize, ttsProvider } from "./tts-server";
import { hit, isLimited } from "./rate-limit";
import { exec } from "./db";

/**
 * รับ { text, voice, rate } แล้วตอบเป็นไฟล์ MP3
 * จำกัดจำนวนครั้งต่อคน กันใครเอาลิงก์ไปยิงจนโควตาหมด
 */
export async function ttsResponse(req: Request, limitKey: string, max: number, usage: { userId: number; source: "widget" | "dashboard" }) {
  if (!ttsProvider()) return NextResponse.json({ message: "ยังไม่ได้ตั้งค่าเสียงอ่านจากเซิร์ฟเวอร์" }, { status: 501 });
  if (await isLimited(limitKey, max)) return NextResponse.json({ message: "ขอเสียงอ่านถี่เกินไป รอสักครู่" }, { status: 429 });

  const b = (await req.json().catch(() => ({}))) as { text?: unknown; voice?: unknown; rate?: unknown };
  const text = cleanText(b.text);
  if (!text) return NextResponse.json({ message: "ไม่มีข้อความ" }, { status: 400 });
  await hit(limitKey, 10 * 60_000);

  try {
    const r = await synthesize(text, b.voice === "male" ? "male" : "female", Number(b.rate) || 1);
    // นับเฉพาะครั้งที่ส่งไปให้ผู้ให้บริการจริง (ดึงจากแคชไม่เสียโควตา)
    if (!r.cached) {
      await exec("INSERT INTO tts_usage (user_id, source, provider, tier, voice_name, chars) VALUES (?, ?, ?, ?, ?, ?)", [
        usage.userId,
        usage.source,
        r.provider,
        r.tier,
        r.voiceName.slice(0, 60),
        text.length,
      ]).catch((e) => console.warn("[tts] นับการใช้งานไม่ได้ (ยังไม่ได้รัน db:migrate?)", (e as Error).message));
    }
    return new Response(new Uint8Array(r.audio), { headers: { "Content-Type": "audio/mpeg", "Cache-Control": "no-store" } });
  } catch (e) {
    console.error("[tts]", (e as Error).message);
    return NextResponse.json({ message: "สร้างเสียงอ่านไม่สำเร็จ" }, { status: 502 });
  }
}
