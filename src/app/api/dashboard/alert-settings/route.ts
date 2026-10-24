import { NextResponse } from "next/server";
import { currentUserId } from "@/lib/auth";
import { getSoundSettings, sanitize, saveSoundSettings, toClient, widgetSoundUrl } from "@/lib/alert-settings";
import { findStreamerById } from "@/lib/streamers";
import { emitSettings } from "@/lib/store";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const userId = await currentUserId();
  if (!userId) return NextResponse.json({ message: "เข้าสู่ระบบก่อน" }, { status: 401 });
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;

  const cur = await getSoundSettings(userId);
  const next = sanitize(body, cur);
  if (next.soundPreset === "custom" && !next.soundFile) {
    return NextResponse.json({ message: "อัปโหลดไฟล์เสียงก่อน แล้วค่อยเลือกใช้เสียงของฉัน" }, { status: 400 });
  }
  try {
    await saveSoundSettings(userId, next);
  } catch (e) {
    return NextResponse.json({ message: (e as Error).message }, { status: 500 });
  }

  // อัปเดต widget ใน OBS ทันที
  const s = await findStreamerById(userId);
  if (s) await emitSettings(userId, toClient(next, widgetSoundUrl(s.widgetToken, next.soundFile)));
  return NextResponse.json({ ok: true });
}
