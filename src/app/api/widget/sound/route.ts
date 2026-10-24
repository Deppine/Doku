import { findStreamerByWidgetToken } from "@/lib/streamers";
import { getSoundSettings } from "@/lib/alert-settings";
import { readUpload } from "@/lib/uploads";

export const runtime = "nodejs";

/** ไฟล์เสียงแจ้งเตือนสำหรับ widget ใน OBS (ใช้ token เดียวกับ widget) */
export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get("token") ?? "";
  const s = await findStreamerByWidgetToken(token);
  if (!s) return new Response("invalid token", { status: 401 });
  const st = await getSoundSettings(s.id);
  if (!st.soundFile) return new Response("not found", { status: 404 });
  const buf = await readUpload(st.soundFile).catch(() => null);
  if (!buf) return new Response("not found", { status: 404 });
  const ext = st.soundFile.split(".").pop();
  const type = ext === "wav" ? "audio/wav" : ext === "ogg" ? "audio/ogg" : ext === "webm" ? "audio/webm" : ext === "m4a" ? "audio/mp4" : ext === "aac" ? "audio/aac" : "audio/mpeg";
  // ชื่อไฟล์อยู่ในลิงก์ (?v=) แล้ว เปลี่ยนไฟล์ = ลิงก์ใหม่ จึง cache ได้
  return new Response(new Uint8Array(buf), { headers: { "Content-Type": type, "Cache-Control": "private, max-age=86400" } });
}
