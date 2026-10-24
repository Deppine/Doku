import { findStreamerByWidgetToken } from "@/lib/streamers";
import { onAlert, onSettings, type AlertEvent } from "@/lib/store";
import { getSoundSettings, toClient, widgetSoundUrl } from "@/lib/alert-settings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Server-Sent Events: widget ใน OBS เปิดค้างไว้เพื่อรับ alert แบบ realtime */
export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get("token") ?? "";
  const streamer = await findStreamerByWidgetToken(token);
  if (!streamer) return new Response("invalid token", { status: 401 });

  const stored = await getSoundSettings(streamer.id);
  const sound = toClient(stored, widgetSoundUrl(token, stored.soundFile));
  const encoder = new TextEncoder();
  let cleanup = () => {};

  const stream = new ReadableStream({
    start(controller) {
      const send = (event: string, data: unknown) =>
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));

      send("ready", { username: streamer.username, sound });
      const offAlert = onAlert(streamer.id, (e: AlertEvent) => send("alert", e));
      const offSettings = onSettings(streamer.id, (s) => send("settings", s));
      const off = () => {
        offAlert();
        offSettings();
      };
      const ping = setInterval(() => controller.enqueue(encoder.encode(`: ping\n\n`)), 15_000);

      cleanup = () => {
        clearInterval(ping);
        off();
        try {
          controller.close();
        } catch {}
      };
      req.signal.addEventListener("abort", cleanup);
    },
    cancel() {
      cleanup();
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
