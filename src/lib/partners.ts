/**
 * แถบโลโก้เลื่อนบนหน้าแรก (พาร์ทเนอร์ / ผู้สนับสนุน)
 * - logo: ไฟล์ใน public/partners/ (PNG/SVG พื้นใส) · ไม่ใส่ = แสดงเป็นชื่อ
 * - url: ลิงก์เมื่อกด · ไม่ใส่ = กดไม่ได้
 * - ลิสต์ว่าง = ไม่แสดงแถบ
 *
 */
export type Partner = { name: string; logo?: string; url?: string };

// ใส่พาร์ทเนอร์จริงที่นี่ เช่น { name: "ชื่อร้าน", logo: "/partners/shop.png", url: "https://..." }
export const PARTNERS: Partner[] = [];
