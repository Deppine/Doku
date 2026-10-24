import QRCode from "qrcode";
import { findStreamer } from "@/lib/streamers";
import { siteUrl } from "@/lib/site-url";

export const runtime = "nodejs";

/**
 * QR ที่สแกนแล้วเปิดหน้าโดเนท /<username>
 *   ?format=png (ค่าเริ่มต้น) | svg   ?size=200–2000 (px, เฉพาะ png)   ?download=1 ให้ดาวน์โหลดเป็นไฟล์
 */
export async function GET(req: Request, ctx: { params: Promise<{ username: string }> }) {
  const username = (await ctx.params).username.toLowerCase();
  const streamer = await findStreamer(username);
  if (!streamer) return new Response("not found", { status: 404 });

  const sp = new URL(req.url).searchParams;
  const format = sp.get("format") === "svg" ? "svg" : "png";
  const size = Math.min(2000, Math.max(200, Number(sp.get("size")) || 800));
  const link = `${await siteUrl()}/${streamer.username}`;
  const opts = { margin: 2, errorCorrectionLevel: "M" as const, color: { dark: "#1d1d1f", light: "#ffffff" } };

  const headers: Record<string, string> = { "Cache-Control": "public, max-age=3600" };
  if (sp.get("download")) headers["Content-Disposition"] = `attachment; filename="donate-qr-${streamer.username}.${format}"`;

  if (format === "svg") {
    const svg = await QRCode.toString(link, { ...opts, type: "svg" });
    return new Response(svg, { headers: { ...headers, "Content-Type": "image/svg+xml" } });
  }
  const png = await QRCode.toBuffer(link, { ...opts, type: "png", width: size });
  return new Response(new Uint8Array(png), { headers: { ...headers, "Content-Type": "image/png" } });
}
