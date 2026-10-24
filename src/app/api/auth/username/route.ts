import { NextResponse } from "next/server";
import { usernameTaken, validateUsername } from "@/lib/users";

export const runtime = "nodejs";

/** เช็คชื่อผู้ใช้ระหว่างพิมพ์ในหน้าสมัคร */
export async function GET(req: Request) {
  const u = (new URL(req.url).searchParams.get("u") ?? "").trim().toLowerCase();
  const err = validateUsername(u);
  if (err) return NextResponse.json({ available: false, message: err });
  if (await usernameTaken(u)) return NextResponse.json({ available: false, message: "ชื่อนี้มีคนใช้แล้ว" });
  return NextResponse.json({ available: true });
}
