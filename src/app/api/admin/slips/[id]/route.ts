import { currentUser } from "@/lib/auth";
import { query, type RowDataPacket } from "@/lib/db";
import { readUpload } from "@/lib/uploads";

export const runtime = "nodejs";

const TYPES: Record<string, string> = { jpeg: "image/jpeg", jpg: "image/jpeg", png: "image/png", webp: "image/webp", gif: "image/gif", heic: "image/heic" };

/** รูปสลิปสำหรับผู้ดูแล (ตรวจรายการที่มีปัญหา) */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const me = await currentUser();
  if (me?.role !== "admin") return new Response("forbidden", { status: 403 });
  const id = Number((await ctx.params).id);
  const [s] = await query<RowDataPacket & { stored_file_path: string }>("SELECT stored_file_path FROM payment_slips WHERE id = ?", [id]);
  if (!s) return new Response("not found", { status: 404 });
  const buf = await readUpload(s.stored_file_path).catch(() => null);
  if (!buf) return new Response("ไฟล์สลิปไม่อยู่แล้ว", { status: 404 });
  const ext = s.stored_file_path.split(".").pop()?.toLowerCase() ?? "";
  return new Response(new Uint8Array(buf), {
    headers: { "Content-Type": TYPES[ext] ?? "application/octet-stream", "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" },
  });
}
