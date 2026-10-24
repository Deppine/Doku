/**
 * นับครั้ง (กันเดารหัสผ่าน / สมัครรัว) เก็บในตาราง rate_limits ใช้ร่วมกันทุกเครื่อง
 * ถ้ายังไม่มีตาราง (ยังไม่ได้ migrate) จะไม่บล็อกใคร
 */
import { exec, query, type RowDataPacket } from "./db";

export function clientIp(req: Request) {
  return req.headers.get("cf-connecting-ip") ?? req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
}

/** เกินโควตาแล้วหรือยัง */
export async function isLimited(key: string, max: number) {
  try {
    const [r] = await query<RowDataPacket & { n: number; until_ms: number }>("SELECT n, until_ms FROM rate_limits WHERE k = ?", [key]);
    return !!r && Number(r.until_ms) > Date.now() && Number(r.n) >= max;
  } catch {
    return false;
  }
}

/** นับเพิ่ม 1 ครั้ง (หน้าต่างเวลาเริ่มนับจากครั้งแรก) */
export async function hit(key: string, windowMs: number) {
  const now = Date.now();
  await exec(
    `INSERT INTO rate_limits (k, n, until_ms) VALUES (?, 1, ?)
     ON DUPLICATE KEY UPDATE n = IF(until_ms > ?, n + 1, 1), until_ms = IF(until_ms > ?, until_ms, VALUES(until_ms))`,
    [key.slice(0, 191), now + windowMs, now, now]
  ).catch(() => {});
  if (Math.random() < 0.02) await exec("DELETE FROM rate_limits WHERE until_ms < ?", [now]).catch(() => {});
}

export async function reset(key: string) {
  await exec("DELETE FROM rate_limits WHERE k = ?", [key]).catch(() => {});
}
