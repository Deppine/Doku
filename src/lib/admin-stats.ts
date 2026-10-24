/**
 * ตัวเลขภาพรวมและรายการโดเนทล่าสุดทั้งระบบ (หน้า /admin)
 * "วันนี้/เดือนนี้" นับตามเวลาไทย (UTC+7) ไม่ขึ้นกับเขตเวลาของเซิร์ฟเวอร์ฐานข้อมูล
 */
import { query, type RowDataPacket } from "./db";

const TZ_OFFSET_MS = 7 * 60 * 60 * 1000;

/** เวลาเริ่มวัน/เดือนตามเวลาไทย เป็นวินาที (unix) */
function bangkokStarts(now = Date.now()) {
  const t = new Date(now + TZ_OFFSET_MS);
  const day = Date.UTC(t.getUTCFullYear(), t.getUTCMonth(), t.getUTCDate()) - TZ_OFFSET_MS;
  const month = Date.UTC(t.getUTCFullYear(), t.getUTCMonth(), 1) - TZ_OFFSET_MS;
  return { day: Math.floor(day / 1000), month: Math.floor(month / 1000) };
}

export type AdminStats = {
  todayTotal: number;
  todayCount: number;
  monthTotal: number;
  monthCount: number;
  activeStreamers: number;
  pendingUsers: number;
  rejected7d: number;
};

export async function adminStats(): Promise<AdminStats> {
  const { day, month } = bangkokStarts();
  const [[d], [u], [r]] = await Promise.all([
    query<RowDataPacket & { tt: number | null; tn: number; mt: number | null; mn: number }>(
      `SELECT
         SUM(CASE WHEN UNIX_TIMESTAMP(verified_at) >= ? THEN COALESCE(paid_amount, expected_amount) END) AS tt,
         COUNT(CASE WHEN UNIX_TIMESTAMP(verified_at) >= ? THEN 1 END) AS tn,
         SUM(COALESCE(paid_amount, expected_amount)) AS mt,
         COUNT(*) AS mn
       FROM donations WHERE status = 'verified' AND UNIX_TIMESTAMP(verified_at) >= ?`,
      [day, day, month]
    ),
    query<RowDataPacket & { active: number; pending: number }>(
      `SELECT
         COUNT(CASE WHEN u.status = 'active' AND p.promptpay_id IS NOT NULL THEN 1 END) AS active,
         COUNT(CASE WHEN u.status = 'pending' THEN 1 END) AS pending
       FROM users u LEFT JOIN payment_settings p ON p.user_id = u.id`
    ),
    query<RowDataPacket & { n: number }>(
      "SELECT COUNT(*) AS n FROM payment_verifications WHERE verification_status = 'rejected' AND checked_at > NOW() - INTERVAL 7 DAY"
    ),
  ]);
  return {
    todayTotal: Number(d?.tt ?? 0),
    todayCount: Number(d?.tn ?? 0),
    monthTotal: Number(d?.mt ?? 0),
    monthCount: Number(d?.mn ?? 0),
    activeStreamers: Number(u?.active ?? 0),
    pendingUsers: Number(u?.pending ?? 0),
    rejected7d: Number(r?.n ?? 0),
  };
}

export type AdminDonation = {
  id: number;
  ref: string;
  streamer: { username: string; displayName: string };
  donorName: string;
  message: string;
  expected: number;
  paid: number | null;
  /** verified = ผ่าน, waiting = รอโอน/รอสลิป, expired = หมดอายุ, rejected = ไม่ผ่าน */
  status: "verified" | "waiting" | "expired" | "rejected";
  createdAt: number;
  slipId: number | null;
  slipCount: number;
  /** ผลตรวจสลิปครั้งล่าสุดที่ไม่ผ่าน */
  lastIssue: { code: string; amount: number | null } | null;
};

export async function recentDonations(limit = 50): Promise<AdminDonation[]> {
  const rows = await query<
    RowDataPacket & {
      id: number;
      donation_ref: string;
      username: string;
      display_name: string;
      donor_name: string | null;
      message: string | null;
      expected_amount: number;
      paid_amount: number | null;
      status: string;
      expired_now: number;
      ms: number;
      slip_id: number | null;
      slip_count: number;
      issue_code: string | null;
      issue_amount: number | null;
    }
  >(
    `SELECT d.id, d.donation_ref, u.username, u.display_name, d.donor_name, d.message,
            d.expected_amount, d.paid_amount, d.status,
            (d.expires_at IS NOT NULL AND d.expires_at < NOW()) AS expired_now,
            UNIX_TIMESTAMP(d.created_at) * 1000 AS ms,
            (SELECT s.id FROM payment_slips s WHERE s.donation_id = d.id ORDER BY s.id DESC LIMIT 1) AS slip_id,
            (SELECT COUNT(*) FROM payment_slips s WHERE s.donation_id = d.id) AS slip_count,
            (SELECT v.response_code FROM payment_verifications v JOIN payment_slips s ON s.id = v.slip_id
              WHERE s.donation_id = d.id AND v.verification_status = 'rejected' ORDER BY v.id DESC LIMIT 1) AS issue_code,
            (SELECT v.amount FROM payment_verifications v JOIN payment_slips s ON s.id = v.slip_id
              WHERE s.donation_id = d.id AND v.verification_status = 'rejected' ORDER BY v.id DESC LIMIT 1) AS issue_amount
     FROM donations d JOIN users u ON u.id = d.recipient_user_id
     ORDER BY d.id DESC LIMIT ?`,
    [limit]
  );
  return rows.map((r) => {
    let status: AdminDonation["status"];
    if (r.status === "verified") status = "verified";
    else if (r.status === "rejected" || r.status === "refunded") status = "rejected";
    else if (r.status === "expired" || Number(r.expired_now) === 1) status = r.issue_code ? "rejected" : "expired";
    else status = "waiting";
    return {
      id: Number(r.id),
      ref: r.donation_ref.slice(0, 8).toUpperCase(),
      streamer: { username: r.username, displayName: r.display_name },
      donorName: r.donor_name ?? "ไม่ระบุชื่อ",
      message: r.message ?? "",
      expected: Number(r.expected_amount),
      paid: r.paid_amount == null ? null : Number(r.paid_amount),
      status,
      createdAt: Number(r.ms),
      slipId: r.slip_id == null ? null : Number(r.slip_id),
      slipCount: Number(r.slip_count),
      lastIssue: r.issue_code ? { code: r.issue_code, amount: r.issue_amount == null ? null : Number(r.issue_amount) } : null,
    };
  });
}
