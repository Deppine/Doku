/**
 * ด่านแรกของหน้าหลังบ้าน: ไม่มีคุกกี้ล็อกอิน → พาไปหน้า /login
 * (ตรวจลายเซ็นคุกกี้และ role จริงอีกชั้นในแต่ละหน้า/API)
 */
import { NextResponse, type NextRequest } from "next/server";

export function proxy(req: NextRequest) {
  if (req.cookies.has("donate_session")) return NextResponse.next();

  if (req.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.json({ message: "เข้าสู่ระบบก่อน" }, { status: 401 });
  }
  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.search = `?next=${encodeURIComponent(req.nextUrl.pathname + req.nextUrl.search)}`;
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/dashboard/:path*", "/admin/:path*", "/api/dashboard/:path*", "/api/admin/:path*", "/api/widget/test"],
};
