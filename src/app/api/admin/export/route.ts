import { currentUser } from "@/lib/auth";
import { query, type RowDataPacket } from "@/lib/db";
import { rangeBounds, toRange } from "@/lib/admin-dashboard";

export const runtime = "nodejs";

const STATUS: Record<string, string> = {
  pending: "รอโอน",
  submitted: "ส่งสลิปแล้ว",
  verified: "ผ่าน",
  rejected: "ไม่ผ่าน",
  expired: "หมดอายุ",
  refunded: "คืนเงิน",
};

const cell = (v: unknown) => {
  const s = v == null ? "" : String(v);
  // กันสูตร Excel (=, +, -, @) และใส่ "" ครอบเมื่อมีจุลภาค/ขึ้นบรรทัด
  const safe = /^[=+\-@]/.test(s) ? `'${s}` : s;
  return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
};

/** 2026-10-25 15:04:09 ตามเวลาไทย */
const thaiTime = (ts: number) => new Date((ts + 7 * 3600) * 1000).toISOString().slice(0, 19).replace("T", " ");

/** ส่งออกรายการโดเนทตามช่วงเวลาเป็น CSV (เปิดใน Excel ภาษาไทยได้) */
export async function GET(req: Request) {
  const me = await currentUser();
  if (me?.role !== "admin") return new Response("forbidden", { status: 403 });
  const range = toRange(new URL(req.url).searchParams.get("range"));
  const { from, to } = rangeBounds(range);
  const rows = await query<RowDataPacket>(
    `SELECT d.donation_ref, u.username, u.display_name, d.donor_name, d.message, d.expected_amount, d.paid_amount, d.status,
            UNIX_TIMESTAMP(d.created_at) AS ts
     FROM donations d JOIN users u ON u.id = d.recipient_user_id
     WHERE UNIX_TIMESTAMP(d.created_at) >= ? AND UNIX_TIMESTAMP(d.created_at) < ?
     ORDER BY d.id DESC`,
    [from, to]
  );
  const head = ["เวลา (ไทย)", "เลขอ้างอิง", "สตรีมเมอร์", "ชื่อที่แสดง", "ผู้โดเนท", "ข้อความ", "ยอดที่ต้องโอน", "ยอดที่ได้รับ", "สถานะ"];
  const lines = rows.map((r) =>
    [
      thaiTime(Number(r.ts)),
      String(r.donation_ref).slice(0, 8).toUpperCase(),
      r.username,
      r.display_name,
      r.donor_name ?? "ไม่ระบุชื่อ",
      r.message ?? "",
      Number(r.expected_amount).toFixed(2),
      r.paid_amount == null ? "" : Number(r.paid_amount).toFixed(2),
      STATUS[r.status] ?? r.status,
    ]
      .map(cell)
      .join(",")
  );
  const csv = "﻿" + [head.join(","), ...lines].join("\r\n");
  const name = `doku-donations-${range}-${new Date().toISOString().slice(0, 10)}.csv`;
  return new Response(csv, {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="${name}"`, "Cache-Control": "no-store" },
  });
}
