import { findStreamerByWidgetToken } from "@/lib/streamers";
import { getSoundSettings } from "@/lib/alert-settings";
import { imageType, readUpload } from "@/lib/uploads";

export const runtime = "nodejs";

/** รูป/GIF ประกอบแจ้งเตือน สำหรับ widget ใน OBS (ใช้ token เดียวกับ widget) */
export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get("token") ?? "";
  const s = await findStreamerByWidgetToken(token);
  if (!s) return new Response("invalid token", { status: 401 });
  const st = await getSoundSettings(s.id);
  if (!st.alertImage) return new Response("not found", { status: 404 });
  const buf = await readUpload(st.alertImage).catch(() => null);
  if (!buf) return new Response("not found", { status: 404 });
  // ชื่อไฟล์อยู่ในลิงก์ (?v=) แล้ว เปลี่ยนรูป = ลิงก์ใหม่ จึง cache ได้
  return new Response(new Uint8Array(buf), { headers: { "Content-Type": imageType(st.alertImage), "Cache-Control": "private, max-age=86400" } });
}
