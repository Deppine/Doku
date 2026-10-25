import { findStreamerByWidgetToken } from "@/lib/streamers";
import { ttsResponse } from "@/lib/tts-response";

export const runtime = "nodejs";

/** เสียงอ่านข้อความสำหรับ widget ใน OBS (ยืนยันด้วย token ของ widget) */
export async function POST(req: Request) {
  const token = new URL(req.url).searchParams.get("token") ?? "";
  const s = await findStreamerByWidgetToken(token);
  if (!s) return new Response("invalid token", { status: 401 });
  return ttsResponse(req, `tts:w:${s.id}`, 60, { userId: s.id, source: "widget" }); // 60 ครั้ง / 10 นาที
}
