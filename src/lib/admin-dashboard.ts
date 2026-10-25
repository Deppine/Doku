/**
 * ข้อมูลหน้าแดชบอร์ดผู้ดูแล (/admin) ตามช่วงเวลา วันนี้ / 7 วัน / 30 วัน
 * ทุกช่วงนับตามเวลาไทย (UTC+7)
 */
import { db, query, type RowDataPacket } from "./db";
import { maskPromptPay } from "./promptpay";

export type Range = "today" | "7d" | "30d";
export const RANGES: { v: Range; label: string }[] = [
  { v: "today", label: "วันนี้" },
  { v: "7d", label: "7 วัน" },
  { v: "30d", label: "30 วัน" },
];
export const toRange = (v: unknown): Range => (v === "today" || v === "7d" ? v : "30d");

const TZ = 7 * 3600;
const DAY = 86400;

/** วินาที unix ของเที่ยงคืนวันนี้ตามเวลาไทย */
function todayStart(now = Math.floor(Date.now() / 1000)) {
  return Math.floor((now + TZ) / DAY) * DAY - TZ;
}

export function rangeBounds(range: Range) {
  const day = todayStart();
  const days = range === "today" ? 1 : range === "7d" ? 7 : 30;
  const from = day - (days - 1) * DAY;
  const to = day + DAY;
  return { from, to, days, prevFrom: from - days * DAY, day };
}

const AMT = "COALESCE(paid_amount, expected_amount)";

/** ยอด/จำนวนโดเนทที่ผ่าน แบ่งเป็นช่อง ๆ ละ size วินาที */
async function buckets(from: number, size: number, n: number) {
  const rows = await query<RowDataPacket & { b: number; total: number; c: number }>(
    `SELECT FLOOR((UNIX_TIMESTAMP(verified_at) - ?) / ?) AS b, SUM(${AMT}) AS total, COUNT(*) AS c
     FROM donations WHERE status = 'verified' AND UNIX_TIMESTAMP(verified_at) >= ? AND UNIX_TIMESTAMP(verified_at) < ?
     GROUP BY b`,
    [from, size, from, from + size * n]
  );
  const total = Array<number>(n).fill(0);
  const count = Array<number>(n).fill(0);
  for (const r of rows) {
    const i = Number(r.b);
    if (i >= 0 && i < n) {
      total[i] = Number(r.total);
      count[i] = Number(r.c);
    }
  }
  return { total, count };
}

async function sumBetween(from: number, to: number) {
  const [r] = await query<RowDataPacket & { total: number | null; c: number }>(
    `SELECT SUM(${AMT}) AS total, COUNT(*) AS c FROM donations
     WHERE status = 'verified' AND UNIX_TIMESTAMP(verified_at) >= ? AND UNIX_TIMESTAMP(verified_at) < ?`,
    [from, to]
  );
  return { total: Number(r?.total ?? 0), count: Number(r?.c ?? 0) };
}

/** อัตราสลิปผ่าน = ผลตรวจที่ผ่าน / ผลตรวจทั้งหมด (ไม่นับรายการที่ไม่ได้ส่งสลิป) */
async function passRate(from: number, to: number) {
  const [r] = await query<RowDataPacket & { ok: number; bad: number }>(
    `SELECT SUM(verification_status = 'verified') AS ok, SUM(verification_status = 'rejected') AS bad
     FROM payment_verifications WHERE UNIX_TIMESTAMP(checked_at) >= ? AND UNIX_TIMESTAMP(checked_at) < ?`,
    [from, to]
  );
  const ok = Number(r?.ok ?? 0);
  const bad = Number(r?.bad ?? 0);
  return ok + bad ? ok / (ok + bad) : null;
}

/** เปลี่ยนแปลงเทียบช่วงก่อน (null = ช่วงก่อนไม่มียอด เทียบไม่ได้) */
const pct = (cur: number, prev: number) => (prev > 0 ? (cur - prev) / prev : null);

export async function dashboard(range: Range) {
  const { from, to, days, prevFrom, day } = rangeBounds(range);
  const chartSize = range === "today" ? 3600 : DAY;
  const chartN = range === "today" ? 24 : days;
  const sparkSize = Math.max(3600, Math.round((to - from) / 7));

  const [today, yesterday, cur, prev, chart, week, rangeSpark, rate, ratePrev] = await Promise.all([
    sumBetween(day, day + DAY),
    sumBetween(day - DAY, day),
    sumBetween(from, to),
    sumBetween(prevFrom, from),
    buckets(from, chartSize, chartN),
    buckets(day - 6 * DAY, DAY, 7),
    buckets(from, sparkSize, 7),
    passRate(from, to),
    passRate(prevFrom, from),
  ]);

  return {
    range,
    from,
    chartSize,
    today: { ...today, delta: pct(today.total, yesterday.total), spark: week.total },
    period: { ...cur, delta: pct(cur.total, prev.total), spark: rangeSpark.total, prevTotal: prev.total },
    verified: { count: cur.count, avg: cur.count ? cur.total / cur.count : 0, spark: rangeSpark.count },
    passRate: { value: rate, delta: rate !== null && ratePrev !== null ? rate - ratePrev : null },
    chart: chart.total,
  };
}

export type TopStreamer = { id: number; username: string; displayName: string; total: number; count: number; online: boolean };

export async function topStreamers(range: Range, limit = 6): Promise<TopStreamer[]> {
  const { from, to } = rangeBounds(range);
  const rows = await query<RowDataPacket & { id: number; username: string; display_name: string; total: number; c: number; online: number }>(
    `SELECT u.id, u.username, u.display_name, SUM(${AMT}) AS total, COUNT(*) AS c,
            (u.widget_seen_at IS NOT NULL AND u.widget_seen_at > NOW() - INTERVAL 40 SECOND) AS online
     FROM donations d JOIN users u ON u.id = d.recipient_user_id
     WHERE d.status = 'verified' AND UNIX_TIMESTAMP(d.verified_at) >= ? AND UNIX_TIMESTAMP(d.verified_at) < ?
     GROUP BY u.id ORDER BY total DESC LIMIT ?`,
    [from, to, limit]
  );
  return rows.map((r) => ({
    id: Number(r.id),
    username: r.username,
    displayName: r.display_name,
    total: Number(r.total),
    count: Number(r.c),
    online: Number(r.online) === 1,
  }));
}

export async function systemStatus() {
  const t = performance.now();
  await db().query("SELECT 1");
  const dbMs = Math.round(performance.now() - t);

  const [[w], slip] = await Promise.all([
    query<RowDataPacket & { online: number; active: number }>(
      `SELECT SUM(u.widget_seen_at IS NOT NULL AND u.widget_seen_at > NOW() - INTERVAL 40 SECOND) AS online,
              SUM(u.status = 'active' AND p.promptpay_id IS NOT NULL) AS active
       FROM users u LEFT JOIN payment_settings p ON p.user_id = u.id`
    ),
    query<RowDataPacket & { avg_ms: number | null; n: number }>(
      "SELECT AVG(check_ms) AS avg_ms, COUNT(check_ms) AS n FROM payment_slips WHERE uploaded_at > NOW() - INTERVAL 1 DAY"
    ).catch(() => [] as (RowDataPacket & { avg_ms: number | null; n: number })[]),
  ]);
  const s = slip[0];
  return {
    dbMs,
    widgetsOnline: Number(w?.online ?? 0),
    activeStreamers: Number(w?.active ?? 0),
    slipAvgMs: s && Number(s.n) > 0 ? Number(s.avg_ms) : null,
    slipChecks24h: s ? Number(s.n) : 0,
  };
}

/** จำนวนรายการที่สลิปไม่ผ่านวันนี้ (นับต่อรายการโดเนท) */
export async function rejectedToday() {
  const [r] = await query<RowDataPacket & { n: number }>(
    `SELECT COUNT(DISTINCT s.donation_id) AS n
     FROM payment_verifications v JOIN payment_slips s ON s.id = v.slip_id JOIN donations d ON d.id = s.donation_id
     WHERE v.verification_status = 'rejected' AND d.status <> 'verified' AND UNIX_TIMESTAMP(v.checked_at) >= ?`,
    [rangeBounds("today").day]
  );
  return Number(r?.n ?? 0);
}

export type AdminUserRow = {
  id: number;
  username: string;
  displayName: string;
  role: "admin" | "user";
  status: "active" | "pending" | "suspended";
  createdAt: number;
  promptpay: string | null;
  total30: number;
  donationCount: number;
  online: boolean;
  lastLoginAt: number | null;
};

export async function adminUsers(): Promise<AdminUserRow[]> {
  const since = rangeBounds("30d").from;
  // u.* : คอลัมน์ last_login_at อาจยังไม่มีถ้ายังไม่ได้ migrate
  const rows = await query<RowDataPacket>(
    `SELECT u.*, UNIX_TIMESTAMP(u.created_at) * 1000 AS created_ms, p.promptpay_id,
            (SELECT SUM(${AMT}) FROM donations d WHERE d.recipient_user_id = u.id AND d.status = 'verified' AND UNIX_TIMESTAMP(d.verified_at) >= ?) AS total30,
            (SELECT COUNT(*) FROM donations d WHERE d.recipient_user_id = u.id) AS dcount,
            (u.widget_seen_at IS NOT NULL AND u.widget_seen_at > NOW() - INTERVAL 40 SECOND) AS online
     FROM users u LEFT JOIN payment_settings p ON p.user_id = u.id
     ORDER BY FIELD(u.status, 'pending', 'active', 'suspended'), total30 DESC, u.id`,
    [since]
  );
  return rows.map((r) => ({
    id: Number(r.id),
    username: r.username,
    displayName: r.display_name,
    role: r.role === "admin" ? "admin" : "user",
    status: r.status === "pending" || r.status === "suspended" ? r.status : "active",
    createdAt: Number(r.created_ms),
    promptpay: r.promptpay_id ? maskPromptPay(String(r.promptpay_id)) : null,
    total30: Number(r.total30 ?? 0),
    donationCount: Number(r.dcount ?? 0),
    online: Number(r.online) === 1,
    lastLoginAt: r.last_login_at ? new Date(r.last_login_at).getTime() : null,
  }));
}
