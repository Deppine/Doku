// สร้างหรืออัปเดตผู้ใช้ (สตรีมเมอร์)
// ใช้: npm run db:user -- <username> <password> [ชื่อที่แสดง] [--admin]
// --admin = ให้สิทธิ์ผู้ดูแล (เข้าหน้า /admin จัดการผู้ใช้ได้)
// ถ้ามี data/streamers.json จากเวอร์ชันก่อน จะดึงคำแนะนำตัวและเลขพร้อมเพย์ของ username เดียวกันมาให้
import fs from "node:fs";
import crypto from "node:crypto";
import mysql from "mysql2/promise";
import bcrypt from "bcryptjs";

const args = process.argv.slice(2);
const isAdmin = args.includes("--admin");
const [username, password, displayNameArg] = args.filter((a) => a !== "--admin");
if (!username || !password) {
  console.error("ใช้: npm run db:user -- <username> <password> [ชื่อที่แสดง] [--admin]");
  process.exit(1);
}
if (!/^[a-z0-9_]{3,30}$/.test(username)) {
  console.error("username ใช้ได้เฉพาะ a-z 0-9 _ ยาว 3–30 ตัว");
  process.exit(1);
}
if (["dashboard", "streamers", "how-to", "login", "logout", "widget", "api", "admin", "_next", "favicon"].includes(username)) {
  console.error("username นี้ชนกับหน้าในเว็บ เลือกชื่ออื่น");
  process.exit(1);
}
if (password.length < 8) {
  console.error("รหัสผ่านต้องยาวอย่างน้อย 8 ตัว");
  process.exit(1);
}

let legacy = null;
try {
  const list = JSON.parse(fs.readFileSync(new URL("../data/streamers.json", import.meta.url), "utf8"));
  legacy = list.find((s) => s.username === username) ?? null;
} catch {}

const conn = await mysql.createConnection(process.env.DATABASE_URL);
const hash = await bcrypt.hash(password, 12);
const displayName = displayNameArg ?? legacy?.displayName ?? username;

const [rows] = await conn.query("SELECT id FROM users WHERE username = ?", [username]);
let id;
if (rows.length) {
  id = rows[0].id;
  await conn.query("UPDATE users SET password_hash = ?, display_name = ? WHERE id = ?", [hash, displayName, id]);
  if (isAdmin) await conn.query("UPDATE users SET role = 'admin' WHERE id = ?", [id]);
  console.log(`อัปเดตรหัสผ่านของ ${username} แล้ว${isAdmin ? " (ผู้ดูแล)" : ""}`);
} else {
  const [r] = await conn.query(
    "INSERT INTO users (username, password_hash, display_name, role, bio, widget_token) VALUES (?, ?, ?, ?, ?, ?)",
    [username, hash, displayName, isAdmin ? "admin" : "user", legacy?.bio ?? "", crypto.randomBytes(24).toString("hex")]
  );
  id = r.insertId;
  console.log(`สร้างผู้ใช้ ${username} แล้ว (id ${id})${isAdmin ? " สิทธิ์ผู้ดูแล" : ""}`);
}

if (legacy) {
  await conn.query(
    `INSERT INTO payment_settings (user_id, account_name, promptpay_id, qr_file_path, min_amount, presets, allow_custom_amount)
     VALUES (?, ?, ?, '', ?, ?, ?)
     ON DUPLICATE KEY UPDATE account_name = VALUES(account_name), promptpay_id = VALUES(promptpay_id),
       min_amount = VALUES(min_amount), presets = VALUES(presets), allow_custom_amount = VALUES(allow_custom_amount)`,
    [id, legacy.promptpayName, legacy.promptpayId, legacy.minAmount, legacy.presets.join(","), legacy.allowCustomAmount === false ? 0 : 1]
  );
  console.log(`ย้ายการตั้งค่าพร้อมเพย์จาก data/streamers.json แล้ว (${legacy.promptpayId})`);
}
await conn.end();
