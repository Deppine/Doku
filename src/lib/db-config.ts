/**
 * แปลง DATABASE_URL เป็นค่าตั้งการเชื่อมต่อ mysql2 พร้อม SSL
 * ใช้ร่วมกันทั้งเว็บ (db.ts) และสคริปต์ (scripts/*.mjs ผ่าน db-config.mjs ที่เนื้อหาเหมือนกัน)
 *
 * รองรับฐานข้อมูลบนคลาวด์ที่บังคับ SSL เช่น Aiven:
 *   DATABASE_URL=mysql://avnadmin:รหัส@xxx.aivencloud.com:12345/defaultdb?ssl-mode=REQUIRED
 *   DATABASE_CA=<เนื้อหาไฟล์ ca.pem>   (ใส่ทั้งก้อน หรือแทนขึ้นบรรทัดด้วย \n ก็ได้)
 */
export function dbConfig(url = process.env.DATABASE_URL) {
  if (!url) throw new Error("ยังไม่ได้ตั้ง DATABASE_URL");
  const u = new URL(url);
  const mode = (u.searchParams.get("ssl-mode") ?? u.searchParams.get("sslmode") ?? "").toUpperCase();
  u.searchParams.delete("ssl-mode");
  u.searchParams.delete("sslmode");

  const ca = process.env.DATABASE_CA?.replace(/\\n/g, "\n").trim();
  let ssl: { ca?: string; rejectUnauthorized: boolean } | undefined;
  if (ca) {
    ssl = { ca, rejectUnauthorized: true }; // เข้ารหัส + ตรวจใบรับรองเซิร์ฟเวอร์
  } else if (mode && mode !== "DISABLED") {
    // เข้ารหัสแต่ไม่ตรวจใบรับรอง: ใช้ได้ แต่ควรใส่ DATABASE_CA เพื่อกันการดักกลางทาง
    ssl = { rejectUnauthorized: false };
  }

  return {
    host: u.hostname,
    port: Number(u.port || 3306),
    user: decodeURIComponent(u.username),
    password: decodeURIComponent(u.password),
    database: decodeURIComponent(u.pathname.replace(/^\//, "")),
    ssl,
    charset: "utf8mb4",
    decimalNumbers: true, // DECIMAL → number
  };
}
