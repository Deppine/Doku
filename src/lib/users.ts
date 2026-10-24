/**
 * จัดการบัญชีผู้ใช้ (ใช้ในหน้า /admin)
 */
import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { exec, query, type RowDataPacket } from "./db";

export type Role = "admin" | "user";
export type UserStatus = "active" | "pending" | "suspended";

export function toStatus(v: unknown): UserStatus {
  return v === "pending" || v === "suspended" ? v : "active";
}

export type UserRow = {
  id: number;
  username: string;
  displayName: string;
  role: Role;
  status: UserStatus;
  createdAt: number;
  hasPayment: boolean;
  donationCount: number;
  donationTotal: number;
};

/** ชื่อที่ชนกับหน้าในเว็บ ห้ามใช้เป็น username */
export const RESERVED = ["dashboard", "streamers", "how-to", "login", "logout", "widget", "api", "admin", "_next", "favicon"];

export function validateUsername(u: string): string | null {
  if (!/^[a-z0-9_]{3,30}$/.test(u)) return "ชื่อผู้ใช้ใช้ได้เฉพาะ a-z 0-9 และ _ ยาว 3–30 ตัว";
  if (RESERVED.includes(u)) return "ชื่อนี้ชนกับหน้าในเว็บ เลือกชื่ออื่น";
  return null;
}

export function validatePassword(p: string): string | null {
  return p.length >= 8 ? null : "รหัสผ่านต้องยาวอย่างน้อย 8 ตัว";
}

export async function listUsers(): Promise<UserRow[]> {
  const rows = await query<
    RowDataPacket & {
      id: number;
      username: string;
      display_name: string;
      role: string;
      status: string;
      created_ms: number;
      has_payment: number;
      n: number;
      total: number | null;
    }
  >(
    `SELECT u.id, u.username, u.display_name, u.role, u.status, UNIX_TIMESTAMP(u.created_at) * 1000 AS created_ms,
            (p.id IS NOT NULL) AS has_payment,
            COUNT(d.id) AS n, SUM(COALESCE(d.paid_amount, d.expected_amount)) AS total
     FROM users u
     LEFT JOIN payment_settings p ON p.user_id = u.id
     LEFT JOIN donations d ON d.recipient_user_id = u.id AND d.status = 'verified'
     GROUP BY u.id ORDER BY FIELD(u.status, 'pending', 'active', 'suspended'), u.id`
  );
  return rows.map((r) => ({
    id: Number(r.id),
    username: r.username,
    displayName: r.display_name,
    role: r.role === "admin" ? "admin" : "user",
    status: toStatus(r.status),
    createdAt: Number(r.created_ms),
    hasPayment: Number(r.has_payment) === 1,
    donationCount: Number(r.n),
    donationTotal: Number(r.total ?? 0),
  }));
}

export async function createUser(input: { username: string; password: string; displayName: string; role: Role; status?: UserStatus }) {
  const hash = await bcrypt.hash(input.password, 12);
  try {
    const res = await exec(
      "INSERT INTO users (username, password_hash, display_name, role, status, widget_token) VALUES (?, ?, ?, ?, ?, ?)",
      [input.username, hash, input.displayName, input.role, input.status ?? "active", randomBytes(24).toString("hex")]
    );
    return { ok: true as const, id: res.insertId };
  } catch (e) {
    if ((e as { code?: string }).code === "ER_DUP_ENTRY") return { ok: false as const, message: "ชื่อผู้ใช้นี้มีอยู่แล้ว" };
    throw e;
  }
}

export async function setPassword(id: number, password: string) {
  await exec("UPDATE users SET password_hash = ? WHERE id = ?", [await bcrypt.hash(password, 12), id]);
}

export async function setRole(id: number, role: Role) {
  await exec("UPDATE users SET role = ? WHERE id = ?", [role, id]);
}

export async function setStatus(id: number, status: UserStatus) {
  await exec("UPDATE users SET status = ? WHERE id = ?", [status, id]);
}

export async function countAdmins() {
  const [r] = await query<RowDataPacket & { n: number }>("SELECT COUNT(*) AS n FROM users WHERE role = 'admin' AND status = 'active'");
  return Number(r?.n ?? 0);
}

/** ลบได้เฉพาะบัญชีที่ยังไม่มีรายการโดเนท (กันประวัติการเงินหาย) */
export async function deleteUser(id: number): Promise<{ ok: true } | { ok: false; message: string }> {
  const [r] = await query<RowDataPacket & { n: number }>("SELECT COUNT(*) AS n FROM donations WHERE recipient_user_id = ?", [id]);
  if (Number(r?.n ?? 0) > 0) return { ok: false, message: "บัญชีนี้มีประวัติโดเนทแล้ว ลบไม่ได้ (เปลี่ยนรหัสผ่านเพื่อปิดการเข้าใช้แทน)" };
  await exec("DELETE FROM payment_settings WHERE user_id = ?", [id]);
  await exec("DELETE FROM users WHERE id = ?", [id]);
  return { ok: true };
}

/** คนที่สมัครเองต้องรอผู้ดูแลอนุมัติก่อนหน้าโดเนทจะเปิด (ตั้ง REGISTRATION_APPROVAL=false เพื่อใช้ได้ทันที) */
export function registrationNeedsApproval() {
  return process.env.REGISTRATION_APPROVAL !== "false";
}

/** เปิดให้สมัครเองได้ไหม (ตั้ง REGISTRATION_OPEN=false ใน .env.local เพื่อปิด ให้ผู้ดูแลสร้างบัญชีอย่างเดียว) */
export function registrationOpen() {
  return process.env.REGISTRATION_OPEN !== "false";
}

export async function usernameTaken(username: string) {
  const rows = await query<RowDataPacket>("SELECT 1 FROM users WHERE username = ? LIMIT 1", [username]);
  return rows.length > 0;
}
