/**
 * เก็บไฟล์สลิป (นอกโฟลเดอร์ public เพื่อไม่ให้คนนอกเปิดดูได้)
 * ตั้ง UPLOAD_DIR ใน .env.local เพื่อเปลี่ยนที่เก็บ ค่าเริ่มต้น <โปรเจกต์>/uploads
 */
import fs from "node:fs/promises";
import path from "node:path";
import { createHash, randomBytes } from "node:crypto";

const ROOT = process.env.UPLOAD_DIR || path.join(/* turbopackIgnore: true */ process.cwd(), "uploads");

export async function saveSlipFile(file: File) {
  const buf = Buffer.from(await file.arrayBuffer());
  const hash = createHash("sha256").update(buf).digest("hex");
  const ext = (file.type.split("/")[1] || "bin").replace(/[^a-z0-9]/gi, "").slice(0, 5) || "bin";
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
  const rel = path.posix.join("sounds", String(userId), `${Date.now()}-${randomBytes(4).toString("hex")}.${ext}`);
  const abs = path.join(/* turbopackIgnore: true */ ROOT, rel);
  await fs.mkdir(path.dirname(abs), { recursive: true });
  await fs.writeFile(abs, Buffer.from(await file.arrayBuffer()));
  return rel;
}

export async function readUpload(rel: string) {
  // กันอ่านไฟล์นอกโฟลเดอร์ uploads
  const abs = path.resolve(/* turbopackIgnore: true */ ROOT, rel);
  if (!abs.startsWith(path.resolve(/* turbopackIgnore: true */ ROOT) + path.sep)) throw new Error("BAD_PATH");
  return fs.readFile(abs);
}

export async function removeUpload(rel: string) {
  const abs = path.resolve(/* turbopackIgnore: true */ ROOT, rel);
  if (!abs.startsWith(path.resolve(/* turbopackIgnore: true */ ROOT) + path.sep)) return;
  await fs.rm(abs, { force: true });
}
