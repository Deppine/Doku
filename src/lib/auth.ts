/**
 * ล็อกอินด้วย users.password_hash (bcrypt) + คุกกี้ session แบบลงลายเซ็น HMAC
 * ตั้ง SESSION_SECRET ใน .env.local (สุ่มยาว ๆ)
 */
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { query, type RowDataPacket } from "./db";

const COOKIE = "donate_session";
const MAX_AGE = 60 * 60 * 24; // 1 วัน: ครบแล้วต้องล็อกอินใหม่
const DUMMY_HASH = bcrypt.hashSync("dummy-password-for-timing", 10);

function secret() {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 16) throw new Error("ตั้ง SESSION_SECRET ใน .env.local (อย่างน้อย 16 ตัวอักษร)");
  return s;
}

function sign(value: string) {
  return createHmac("sha256", secret()).update(value).digest("base64url");
}

export async function verifyLogin(username: string, password: string) {
  const [u] = await query<RowDataPacket & { id: number; password_hash: string }>(
    "SELECT id, password_hash FROM users WHERE username = ?",
    [username.trim().toLowerCase()]
  );
  // เทียบ hash ทุกครั้ง แม้ไม่มีผู้ใช้ เพื่อไม่ให้เดาชื่อผู้ใช้จากเวลาตอบกลับได้
  const hash = u?.password_hash?.replace(/^\$2y\$/, "$2b$") ?? DUMMY_HASH;
  const ok = await bcrypt.compare(password, hash);
  return ok && u ? Number(u.id) : null;
}

export async function startSession(userId: number) {
  const exp = Math.floor(Date.now() / 1000) + MAX_AGE;
  const value = `${userId}.${exp}`;
  (await cookies()).set(COOKIE, `${value}.${sign(value)}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production" && !process.env.NEXT_PUBLIC_BASE_URL?.startsWith("http://"),
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function endSession() {
  (await cookies()).delete(COOKIE);
}

/** อ่านคุกกี้ที่ลายเซ็นถูกต้องและยังไม่หมดอายุ (ยังไม่เช็กฐานข้อมูล) */
async function readSession(): Promise<{ id: number; exp: number } | null> {
  const raw = (await cookies()).get(COOKIE)?.value;
  if (!raw) return null;
  const [id, exp, sig] = raw.split(".");
  if (!id || !exp || !sig) return null;
  const expected = Buffer.from(sign(`${id}.${exp}`));
  const given = Buffer.from(sig);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  const now = Date.now() / 1000;
  if (Number(exp) < now) return null;
  // คุกกี้แบบเก่า (อายุ 14 วัน) ใช้ไม่ได้แล้ว → ทุกคนต้องล็อกอินใหม่ภายใต้กติกา 1 วัน
  if (Number(exp) > now + MAX_AGE + 300) return null;
  return { id: Number(id), exp: Number(exp) };
}

async function sessionUserId(): Promise<number | null> {
  return (await readSession())?.id ?? null;
}

/** เวลาที่ session ปัจจุบันหมดอายุ (มิลลิวินาที) หรือ null ถ้าไม่ได้ล็อกอิน */
export async function sessionExpiresAt(): Promise<number | null> {
  const s = await readSession();
  return s ? s.exp * 1000 : null;
}

export type SessionUser = { id: number; username: string; displayName: string; role: "admin" | "user"; status: "active" | "pending" };

/** ผู้ใช้ที่ล็อกอินอยู่ (อ่านจากฐานข้อมูลทุกครั้ง: ถ้าถูกลบหรือเปลี่ยน role จะมีผลทันที) */
export async function currentUser(): Promise<SessionUser | null> {
  const id = await sessionUserId();
  if (!id) return null;
  const [u] = await query<RowDataPacket & { id: number; username: string; display_name: string; role: string; status: string }>(
    "SELECT id, username, display_name, role, status FROM users WHERE id = ?",
    [id]
  );
  if (!u || u.status === "suspended") return null; // ถูกระงับ = หลุดจากระบบทันที
  return {
    id: Number(u.id),
    username: u.username,
    displayName: u.display_name,
    role: u.role === "admin" && u.status === "active" ? "admin" : "user",
    status: u.status === "pending" ? "pending" : "active",
  };
}

/** id ผู้ใช้ที่ล็อกอินอยู่และยังใช้งานได้ (บัญชีถูกลบ/ระงับ → null) */
export async function currentUserId(): Promise<number | null> {
  return (await currentUser())?.id ?? null;
}

/** หน้าแรกหลังล็อกอินตาม role */
export function homeFor(role: SessionUser["role"]) {
  return role === "admin" ? "/admin" : "/dashboard";
}

/** กันลิงก์ ?next= พาออกไปเว็บอื่น */
export function safeNext(next: unknown) {
  return typeof next === "string" && next.startsWith("/") && !next.startsWith("//") ? next : null;
}
