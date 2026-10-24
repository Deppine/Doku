// รันไฟล์ db/0xx_*.sql ทุกไฟล์ตามลำดับ แบบข้ามส่วนที่มีอยู่แล้ว
// ใช้: npm run db:migrate
import fs from "node:fs";
import mysql from "mysql2/promise";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("ยังไม่ได้ตั้ง DATABASE_URL ใน .env.local");
  process.exit(1);
}
const conn = await mysql.createConnection(url);
const dir = new URL("../db/", import.meta.url);
const files = fs.readdirSync(dir).filter((f) => /^\d{3}_.+\.sql$/.test(f)).sort();
const statements = files.flatMap((f) =>
  fs
    .readFileSync(new URL(f, dir), "utf8")
    .split(/;\s*$/m)
    .map((s) => s.replace(/--.*$/gm, "").trim())
    .filter(Boolean)
);
console.log("ไฟล์:", files.join(", "));

let applied = 0;
for (const st of statements) {
  try {
    await conn.query(st);
    applied++;
    console.log("✓", st.split("\n")[0]);
  } catch (e) {
    // คอลัมน์/index มีอยู่แล้ว = ข้าม
    if (["ER_DUP_FIELDNAME", "ER_DUP_KEYNAME"].includes(e.code)) console.log("•", "มีอยู่แล้ว:", st.split("\n")[0]);
    else {
      console.error("✗", st, "\n", e.message);
      process.exit(1);
    }
  }
}
await conn.end();
console.log(`เสร็จ (${applied} คำสั่งใหม่)`);
