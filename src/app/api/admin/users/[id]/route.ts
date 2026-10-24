import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { countAdmins, deleteUser, setPassword, setRole, setStatus, validatePassword } from "@/lib/users";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

async function admin() {
  const me = await currentUser();
  return me?.role === "admin" ? me : null;
}

/** แก้ role / สถานะ (อนุมัติ ระงับ เปิดใช้) หรือรีเซ็ตรหัสผ่าน */
export async function PATCH(req: Request, ctx: Ctx) {
  const me = await admin();
  if (!me) return NextResponse.json({ message: "เฉพาะผู้ดูแลเท่านั้น" }, { status: 403 });
  const id = Number((await ctx.params).id);
  const b = (await req.json().catch(() => ({}))) as { password?: string; role?: string; status?: string };

  if (b.password !== undefined) {
    const err = validatePassword(String(b.password));
    if (err) return NextResponse.json({ message: err }, { status: 400 });
    await setPassword(id, String(b.password));
  }
  if (b.role === "admin" || b.role === "user") {
    // กันผู้ดูแลคนสุดท้ายลดสิทธิ์ตัวเอง แล้วไม่มีใครเข้าหน้าจัดการได้
    if (b.role === "user" && id === me.id && (await countAdmins()) <= 1) {
      return NextResponse.json({ message: "ต้องมีผู้ดูแลอย่างน้อย 1 คน" }, { status: 400 });
    }
    await setRole(id, b.role);
  }
  if (b.status === "active" || b.status === "suspended") {
    if (id === me.id) return NextResponse.json({ message: "เปลี่ยนสถานะบัญชีตัวเองไม่ได้" }, { status: 400 });
    await setStatus(id, b.status);
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const me = await admin();
  if (!me) return NextResponse.json({ message: "เฉพาะผู้ดูแลเท่านั้น" }, { status: 403 });
  const id = Number((await ctx.params).id);
  if (id === me.id) return NextResponse.json({ message: "ลบบัญชีตัวเองไม่ได้" }, { status: 400 });
  const r = await deleteUser(id);
  if (!r.ok) return NextResponse.json({ message: r.message }, { status: 409 });
  return NextResponse.json({ ok: true });
}
