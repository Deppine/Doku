/**
 * ค่าตั้งของระบบ
 * เปิด/ปิดรับสมัครตั้งด้วย REGISTRATION_OPEN ใน .env.local / Vercel (false = ปิด)
 */

/** เปิดให้สมัครเองที่ /register ไหม */
export async function registrationOpen() {
  return process.env.REGISTRATION_OPEN !== "false";
}
