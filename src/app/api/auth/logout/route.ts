import { NextResponse } from "next/server";
import { endSession } from "@/lib/auth";

/** ออกจากระบบ แล้วพากลับหน้าเข้าสู่ระบบ (ใช้ได้ทั้งฟอร์มและ fetch) */
export async function POST(req: Request) {
  await endSession();
  return NextResponse.redirect(new URL("/login", req.url), 303);
}
