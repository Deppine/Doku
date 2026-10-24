/**
 * เก็บไฟล์สลิป / เสียงแจ้งเตือน
 * - ค่าเริ่มต้น: เก็บในฐานข้อมูล (ตาราง stored_files) ใช้ได้ทั้งเครื่องตัวเองและ Vercel
 * - UPLOAD_STORAGE=disk: เก็บในโฟลเดอร์ UPLOAD_DIR (ค่าเริ่มต้น <โปรเจกต์>/uploads)
 * ไฟล์ในฐานข้อมูลอ้างอิงด้วย "db:<id>.<นามสกุล>" ไฟล์เก่าบนดิสก์ยังอ่านได้ตามเดิม
 */
import fs from "node:fs/promises";
import path from "node:path";
import { createHash, randomBytes } from "node:crypto";
import { exec, query, type RowDataPacket } from "./db";

const ROOT = process.env.UPLOAD_DIR || path.join(/* turbopackIgnore: true */ process.cwd(), "uploads");
const USE_DISK = process.env.UPLOAD_STORAGE === "disk";
const DB_REF = /^db:(\d+)(?:\.[a-z0-9]+)?$/;

async function saveToDb(kind: "slip" | "sound", mime: string, buf: Buffer, ext: string) {
  const r = await exec("INSERT INTO stored_files (kind, mime, size, data) VALUES (?, ?, ?, ?)", [kind, mime.slice(0, 100), buf.length, buf]);
  return `db:${r.insertId}.${ext}`;
}

export async function saveSlipFile(file: File) {
  const buf = Buffer.from(await file.arrayBuffer());
  const hash = createHash("sha256").update(buf).digest("hex");
  const ext = (file.type.split("/")[1] || "bin").replace(/[^a-z0-9]/gi, "").slice(0, 5) || "bin";
  if (!USE_DISK) {
    return { storedPath: await saveToDb("slip", file.type || "application/octet-stream", buf, ext), hash, originalName: file.name ? file.name.slice(0, 255) : null };
  }
  const now = new Date();
  const rel = path.posix.join("slips", String(now.getFullYear()), String(now.getMonth() + 1).padStart(2, "0"), `${Date.now()}-${randomBytes(4).toString("hex")}.${ext}`);
  const abs = path.join(/* turbopackIgnore: true */ ROOT, rel);
  await fs.mkdir(path.dirname(abs), { recursive: true });
  await fs.writeFile(abs, buf);
  return { storedPath: rel, hash, originalName: file.name ? file.name.slice(0, 255) : null };
}

const AUDIO_EXT: Record<string, string> = {
  "audio/mpeg": "mp3",
  "audio/mp3": "mp3",
  "audio/wav": "wav",
  "audio/x-wav": "wav",
  "audio/wave": "wav",
  "audio/ogg": "ogg",
  "audio/webm": "webm",
  "audio/mp4": "m4a",
  "audio/x-m4a": "m4a",
  "audio/aac": "aac",
};

export function audioExt(type: string) {
  return AUDIO_EXT[type] ?? null;
}

/** เก็บไฟล์เสียงแจ้งเตือนของสตรีมเมอร์ */
export async function saveSoundFile(userId: number, file: File) {
  const ext = audioExt(file.type);
  if (!ext) throw new Error("UNSUPPORTED");
  if (!USE_DISK) return saveToDb("sound", file.type, Buffer.from(await file.arrayBuffer()), ext);
  const rel = path.posix.join("sounds", String(userId), `${Date.now()}-${randomBytes(4).toString("hex")}.${ext}`);
  const abs = path.join(/* turbopackIgnore: true */ ROOT, rel);
  await fs.mkdir(path.dirname(abs), { recursive: true });
  await fs.writeFile(abs, Buffer.from(await file.arrayBuffer()));
  return rel;
}

export async function readUpload(rel: string) {
  const m = DB_REF.exec(rel);
  if (m) {
    const [row] = await query<RowDataPacket & { data: Buffer }>("SELECT data FROM stored_files WHERE id = ?", [m[1]]);
    if (!row) throw new Error("NOT_FOUND");
    return Buffer.from(row.data);
  }
  // กันอ่านไฟล์นอกโฟลเดอร์ uploads
  const abs = path.resolve(/* turbopackIgnore: true */ ROOT, rel);
  if (!abs.startsWith(path.resolve(/* turbopackIgnore: true */ ROOT) + path.sep)) throw new Error("BAD_PATH");
  return fs.readFile(abs);
}

export async function removeUpload(rel: string) {
  const m = DB_REF.exec(rel);
  if (m) {
    await exec("DELETE FROM stored_files WHERE id = ?", [m[1]]);
    return;
  }
  const abs = path.resolve(/* turbopackIgnore: true */ ROOT, rel);
  if (!abs.startsWith(path.resolve(/* turbopackIgnore: true */ ROOT) + path.sep)) return;
  await fs.rm(abs, { force: true });
}
