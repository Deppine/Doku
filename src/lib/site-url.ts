import { headers } from "next/headers";

/**
 * โดเมนของเว็บตามที่ผู้ใช้เปิดอยู่จริง (ถูกเสมอทั้ง localhost, *.vercel.app และโดเมนของตัวเอง)
 * ไม่มี header (เช่นตอน build) → ใช้ NEXT_PUBLIC_BASE_URL
 */
export async function siteUrl() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  if (!host) return process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";
  const local = /^(localhost|127\.|\[::1\])/.test(host);
  const proto = h.get("x-forwarded-proto")?.split(",")[0] ?? (local ? "http" : "https");
  return `${proto}://${host.split(",")[0]}`;
}
