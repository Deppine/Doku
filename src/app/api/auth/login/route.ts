import { NextResponse } from "next/server";
import { homeFor, safeNext, startSession, verifyLogin } from "@/lib/auth";
import { query, type RowDataPacket } from "@/lib/db";
import { clientIp, hit, isLimited, reset } from "@/lib/rate-limit";

export const runtime = "nodejs";

// กันเดารหัสผ่าน: จำกัด 10 ครั้ง / 10 นาที ต่อ IP (เก็บในฐานข้อมูล ใช้ร่วมกันทุกเครื่อง)

export async function POST(req: Request) {
  const key = `login:${clientIp(req)}`;
  if (await isLimited(key, 10)) {
    return NextResponse.json({ message: "ลองหลายครั้งเกินไป รอ 10 นาทีแล้วลองใหม่" }, { status: 429 });
  }
  const body = (await req.json().catch(() => null)) as { username?: string; password?: string; next?: string } | null;
  const userId = body?.username && body?.password ? await verifyLogin(body.username, body.password) : null;
  if (!userId) {
    await hit(key, 10 * 60_000);
    return NextResponse.json({ message: "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง" }, { status: 401 });
  }
  await reset(key);
  await startSession(userId);
  const [u] = await query<RowDataPacket & { role: string }>("SELECT role FROM users WHERE id = ?", [userId]);
  const role = u?.role === "admin" ? "admin" : "user";
  return NextResponse.json({ ok: true, role, redirect: safeNext(body?.next) ?? homeFor(role) });
}
