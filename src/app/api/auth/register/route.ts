import { NextResponse } from "next/server";
import { startSession } from "@/lib/auth";
import { clientIp, hit, isLimited } from "@/lib/rate-limit";
import { createUser, registrationOpen, validatePassword, validateUsername } from "@/lib/users";

export const runtime = "nodejs";

// กันสมัครรัวจากที่เดียว: 5 บัญชี / ชั่วโมง ต่อ IP (เก็บในฐานข้อมูล)

export async function POST(req: Request) {
  if (!registrationOpen()) return NextResponse.json({ message: "ปิดรับสมัครอยู่ ติดต่อผู้ดูแลเพื่อขอบัญชี" }, { status: 403 });

  const key = `register:${clientIp(req)}`;
  if (await isLimited(key, 5)) {
    return NextResponse.json({ message: "สมัครหลายบัญชีเกินไป ลองใหม่ภายหลัง" }, { status: 429 });
  }

  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  // ช่องดักบอท: คนจริงมองไม่เห็นช่องนี้ ถ้ามีค่าแปลว่าเป็นบอท
  if (b.website) return NextResponse.json({ ok: true, redirect: "/" });

  const username = String(b.username ?? "").trim().toLowerCase();
  const password = String(b.password ?? "");
  const displayName = String(b.displayName ?? "").trim().slice(0, 100);

  const err = validateUsername(username) ?? validatePassword(password);
  if (err) return NextResponse.json({ field: err.includes("รหัสผ่าน") ? "password" : "username", message: err }, { status: 400 });
  if (!displayName) return NextResponse.json({ field: "displayName", message: "ใส่ชื่อที่จะแสดงบนหน้าโดเนท" }, { status: 400 });
  if (password.toLowerCase().includes(username)) {
    return NextResponse.json({ field: "password", message: "รหัสผ่านต้องไม่มีชื่อผู้ใช้อยู่ข้างใน" }, { status: 400 });
  }

  const r = await createUser({ username, password, displayName, role: "user" }); // สมัครเองได้แค่สิทธิ์สตรีมเมอร์
  if (!r.ok) return NextResponse.json({ field: "username", message: r.message }, { status: 409 });

  await hit(key, 60 * 60_000);

  await startSession(r.id);
  return NextResponse.json({ ok: true, redirect: "/dashboard?welcome=1" });
}
