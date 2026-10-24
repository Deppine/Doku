import { NextResponse } from "next/server";
import { homeFor, safeNext, startSession, verifyLogin } from "@/lib/auth";
import { query, type RowDataPacket } from "@/lib/db";

export const runtime = "nodejs";

// กันเดารหัสผ่าน: จำกัด 10 ครั้ง / 10 นาที ต่อ IP (เก็บในหน่วยความจำ)
const g = globalThis as unknown as { __loginTries?: Map<string, { n: number; until: number }> };
const tries = g.__loginTries ?? (g.__loginTries = new Map());

export async function POST(req: Request) {
  const ip = req.headers.get("cf-connecting-ip") ?? req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  const t = tries.get(ip);
  if (t && t.until > Date.now() && t.n >= 10) {
    return NextResponse.json({ message: "ลองหลายครั้งเกินไป รอ 10 นาทีแล้วลองใหม่" }, { status: 429 });
  }
  const body = (await req.json().catch(() => null)) as { username?: string; password?: string; next?: string } | null;
  const userId = body?.username && body?.password ? await verifyLogin(body.username, body.password) : null;
  if (!userId) {
    const cur = t && t.until > Date.now() ? t : { n: 0, until: Date.now() + 10 * 60_000 };
    tries.set(ip, { ...cur, n: cur.n + 1 });
    return NextResponse.json({ message: "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง" }, { status: 401 });
  }
  tries.delete(ip);
  await startSession(userId);
  const [u] = await query<RowDataPacket & { role: string }>("SELECT role FROM users WHERE id = ?", [userId]);
  const role = u?.role === "admin" ? "admin" : "user";
  return NextResponse.json({ ok: true, role, redirect: safeNext(body?.next) ?? homeFor(role) });
}
