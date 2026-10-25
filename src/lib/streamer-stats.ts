/**
 * ข้อมูลแดชบอร์ดสตรีมเมอร์: ยอดสรุป ผู้สนับสนุน เช็กลิสต์ และเป้าหมายโดเนท
 * "วันนี้" นับตามเวลาไทย (UTC+7)
 */
import { exec, query, type RowDataPacket } from "./db";

const DAY = 86400;
const todayStart = () => {
  const now = Math.floor(Date.now() / 1000);
  return Math.floor((now + 7 * 3600) / DAY) * DAY - 7 * 3600;
};
const AMT = "COALESCE(paid_amount, expected_amount)";
/** ชื่อที่นับเป็นผู้สนับสนุน (ไม่นับคนไม่ใส่ชื่อ) */
const NAMED = "donor_name IS NOT NULL AND donor_name <> '' AND donor_name <> 'ไม่ระบุชื่อ'";

export async function streamerOverview(userId: number) {
  const day = todayStart();
  const d30 = day - 29 * DAY;
  const [[sums], [fanCount], fans, [u]] = await Promise.all([
    query<RowDataPacket & { today: number | null; yesterday: number | null; m: number | null; mc: number; all_t: number | null; all_c: number }>(
      `SELECT
         SUM(CASE WHEN UNIX_TIMESTAMP(verified_at) >= ? THEN ${AMT} END) AS today,
         SUM(CASE WHEN UNIX_TIMESTAMP(verified_at) >= ? AND UNIX_TIMESTAMP(verified_at) < ? THEN ${AMT} END) AS yesterday,
         SUM(CASE WHEN UNIX_TIMESTAMP(verified_at) >= ? THEN ${AMT} END) AS m,
         COUNT(CASE WHEN UNIX_TIMESTAMP(verified_at) >= ? THEN 1 END) AS mc,
         SUM(${AMT}) AS all_t, COUNT(*) AS all_c
       FROM donations WHERE recipient_user_id = ? AND status = 'verified'`,
      [day, day - DAY, day, d30, d30, userId]
    ),
    query<RowDataPacket & { n: number; fresh: number }>(
      `SELECT COUNT(*) AS n, SUM(first_at >= ?) AS fresh FROM (
         SELECT donor_name, MIN(UNIX_TIMESTAMP(verified_at)) AS first_at, MAX(UNIX_TIMESTAMP(verified_at)) AS last_at
         FROM donations WHERE recipient_user_id = ? AND status = 'verified' AND ${NAMED}
         GROUP BY donor_name HAVING last_at >= ?) x`,
      [d30, userId, d30]
    ),
    query<RowDataPacket & { donor_name: string; total: number; c: number }>(
      `SELECT donor_name, SUM(${AMT}) AS total, COUNT(*) AS c FROM donations
       WHERE recipient_user_id = ? AND status = 'verified' AND UNIX_TIMESTAMP(verified_at) >= ? AND ${NAMED}
       GROUP BY donor_name ORDER BY total DESC LIMIT 5`,
      [userId, d30]
    ),
    // u.* : alert_tested_at มีหลังรัน 008
    query<RowDataPacket>(
      `SELECT u.*, (u.widget_seen_at IS NOT NULL AND u.widget_seen_at > NOW() - INTERVAL 40 SECOND) AS online FROM users u WHERE u.id = ?`,
      [userId]
    ),
  ]);
  const today = Number(sums?.today ?? 0);
  const yesterday = Number(sums?.yesterday ?? 0);
  return {
    today,
    todayDelta: yesterday > 0 ? (today - yesterday) / yesterday : null,
    month: Number(sums?.m ?? 0),
    monthCount: Number(sums?.mc ?? 0),
    allTime: Number(sums?.all_t ?? 0),
    allCount: Number(sums?.all_c ?? 0),
    supporters: Number(fanCount?.n ?? 0),
    newSupporters: Number(fanCount?.fresh ?? 0),
    fans: fans.map((f) => ({ name: f.donor_name, total: Number(f.total), count: Number(f.c) })),
    online: Number(u?.online) === 1,
    widgetEverConnected: Boolean(u?.widget_seen_at),
    alertTested: Boolean(u?.alert_tested_at),
  };
}

export async function markAlertTested(userId: number) {
  await exec("UPDATE users SET alert_tested_at = NOW() WHERE id = ?", [userId]).catch(() => {});
}

export type Goal = { title: string; target: number; raised: number; startsAt: number };

/** เป้าหมายโดเนท (null = ยังไม่ได้ตั้ง หรือยังไม่ได้ migrate) */
export async function getGoal(userId: number): Promise<Goal | null> {
  try {
    const [g] = await query<RowDataPacket & { title: string; target_amount: number; starts: number }>(
      "SELECT title, target_amount, UNIX_TIMESTAMP(starts_at) AS starts FROM donation_goals WHERE user_id = ?",
      [userId]
    );
    if (!g) return null;
    const [r] = await query<RowDataPacket & { raised: number | null }>(
      `SELECT SUM(${AMT}) AS raised FROM donations WHERE recipient_user_id = ? AND status = 'verified' AND UNIX_TIMESTAMP(verified_at) >= ?`,
      [userId, g.starts]
    );
    return { title: g.title, target: Number(g.target_amount), raised: Number(r?.raised ?? 0), startsAt: Number(g.starts) * 1000 };
  } catch {
    return null;
  }
}

/** ตั้ง/แก้เป้าหมาย reset = เริ่มนับยอดใหม่ตั้งแต่ตอนนี้ */
export async function saveGoal(userId: number, title: string, target: number, reset: boolean) {
  await exec(
    `INSERT INTO donation_goals (user_id, title, target_amount, starts_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)
     ON DUPLICATE KEY UPDATE title = VALUES(title), target_amount = VALUES(target_amount)${reset ? ", starts_at = CURRENT_TIMESTAMP" : ""}`,
    [userId, title, target]
  );
}

export async function deleteGoal(userId: number) {
  await exec("DELETE FROM donation_goals WHERE user_id = ?", [userId]);
}
