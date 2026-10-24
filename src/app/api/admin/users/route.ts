import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { createUser, validatePassword, validateUsername, type Role } from "@/lib/users";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const me = await currentUser();
  if (me?.role !== "admin") return NextResponse.json({ message: "เฉพาะผู้ดูแลเท่านั้น" }, { status: 403 });

  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const username = String(b.username ?? "").trim().toLowerCase();
  const password = String(b.password ?? "");
  const displayName = String(b.displayName ?? "").trim().slice(0, 100) || username;
  const role: Role = b.role === "admin" ? "admin" : "user";

  const err = validateUsername(username) ?? validatePassword(password);
  if (err) return NextResponse.json({ message: err }, { status: 400 });

  const r = await createUser({ username, password, displayName, role });
  if (!r.ok) return NextResponse.json({ message: r.message }, { status: 409 });
  return NextResponse.json({ ok: true, id: r.id });
}
