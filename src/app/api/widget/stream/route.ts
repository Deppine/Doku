import { findStreamerByWidgetToken } from "@/lib/streamers";
import { eventsAfter, latestEventId, markWidgetSeen } from "@/lib/store";
import { getSoundSettings, toClient, widgetSoundUrl } from "@/lib/alert-settings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Vercel: ฟังก์ชันหนึ่งรอบอยู่ได้ไม่เกินนี้ แล้ว widget จะต่อใหม่เองโดยไม่พลาดรายการ (ใช้ Last-Event-ID)
export const maxDuration = 300;

const POLL_MS = 1000;
const LIFETIME_MS = Number(process.env.WIDGET_STREAM_SECONDS ?? 270) * 1000;

/**
 * Server-Sent Events: widget ใน OBS เปิดค้างไว้เพื่อรับ alert
 * เซิร์ฟเวอร์เช็กตาราง widget_events ทุก 1 วินาที จึงใช้ได้แม้มีหลายเครื่อง (Vercel)
 */
export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get("token") ?? "";
  const streamer = await findStreamerByWidgetToken(token);
  if (!streamer) return new Response("invalid token", { status: 401 });

  const resumeFrom = Number(req.headers.get("last-event-id") ?? "");
  let lastId = Number.isFinite(resumeFrom) && resumeFrom > 0 ? resumeFrom : await latestEventId(streamer.id);
  const stored = await getSoundSettings(streamer.id);
  const sound = toClient(stored, widgetSoundUrl(token, stored.soundFile), token);
  await markWidgetSeen(streamer.id).catch(() => {});

  const encoder = new TextEncoder();
  let closed = false;
  let timer: ReturnType<typeof setTimeout> | undefined;

  const stream = new ReadableStream({
    start(controller) {
      const write = (s: string) => {
        if (!closed) controller.enqueue(encoder.encode(s));
      };
      const close = () => {
        if (closed) return;
        closed = true;
        clearTimeout(timer);
        try {
          controller.close();
        } catch {}
      };
      req.signal.addEventListener("abort", close);

      write(`retry: 1500\nevent: ready\ndata: ${JSON.stringify({ username: streamer.username, sound })}\n\n`);

      const started = Date.now();
      let ticks = 0;
      const tick = async () => {
        if (closed) return;
        try {
          for (const e of await eventsAfter(streamer.id, lastId)) {
            lastId = e.id;
            write(`id: ${e.id}\nevent: ${e.kind}\ndata: ${JSON.stringify(e.payload)}\n\n`);
          }
          ticks++;
          if (ticks % 10 === 0) {
            // ลิงก์ถูกสร้างใหม่ → ปิดลิงก์เก่า
            const still = await findStreamerByWidgetToken(token);
            if (!still) return close();
            await markWidgetSeen(streamer.id);
            write(`: ping\n\n`);
          }
        } catch (err) {
          console.error("widget stream", err);
        }
        if (Date.now() - started > LIFETIME_MS) return close(); // widget ต่อใหม่เอง
        timer = setTimeout(tick, POLL_MS);
      };
      timer = setTimeout(tick, POLL_MS);
    },
    cancel() {
      closed = true;
      clearTimeout(timer);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
