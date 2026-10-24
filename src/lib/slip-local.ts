/**
 * อ่านสลิปในเครื่อง (ฟรี): ถอด QR บนสลิปเพื่อเอาเลขอ้างอิง + OCR หายอดเงินและบัญชีผู้รับ
 *
 * ข้อจำกัดสำคัญ: ข้อมูลทั้งหมดมาจาก "รูป" ที่ผู้ชมส่งมา คนที่ตั้งใจแต่งรูปยังหลอกได้
 * ใช้กันการแนบสลิปผิดยอด/ผิดบัญชี/สลิปซ้ำได้ดี แต่ไม่ได้ยืนยันกับธนาคาร
 * ถ้าต้องการยืนยันจริง ให้ใช้ API ตรวจสลิป (SLIP_PROVIDER=easyslip)
 */
import path from "node:path";
import sharp from "sharp";
import jsQR from "jsqr";
import { createWorker, type Worker } from "tesseract.js";
import type { SlipResult } from "./slip";

// ใช้ worker ตัวเดียวต่อเซิร์ฟเวอร์ (สร้างครั้งแรก ~0.5–2 วินาที แล้วใช้ซ้ำ)
// ใช้ข้อมูลภาษาแบบ best_int (2.9 MB) แทนชุดเต็ม (10.9 MB): โหลดเร็วกว่า ~4 เท่า อ่านตัวเลขบนสลิปได้เท่ากัน
const g = globalThis as unknown as { __ocrWorker?: Promise<Worker> };
export function getWorker() {
  if (!g.__ocrWorker) {
    const langPath = path.join(/* turbopackIgnore: true */ process.cwd(), "node_modules", "@tesseract.js-data", "eng", "4.0.0_best_int");
    // cacheMethod "none": ไม่เขียนไฟล์ cache ลงโฟลเดอร์โปรเจกต์ (กัน dev server รีโหลดวน)
    g.__ocrWorker = createWorker("eng", 1, { langPath, gzip: true, cacheMethod: "none" });
    g.__ocrWorker.catch(() => (g.__ocrWorker = undefined)); // สร้างไม่สำเร็จ → ครั้งหน้าลองใหม่
  }
  return g.__ocrWorker;
}

/** ถอด TLV แบบ EMVCo */
function parseTlv(s: string) {
  const out: Record<string, string> = {};
  let i = 0;
  while (i + 4 <= s.length) {
    const tag = s.slice(i, i + 2);
    const len = Number(s.slice(i + 2, i + 4));
    if (!Number.isFinite(len)) break;
    out[tag] = s.slice(i + 4, i + 4 + len);
    i += 4 + len;
  }
  return out;
}

/** QR บนสลิปธนาคารไทย: tag 00 > sub-tag 01 = รหัสธนาคารผู้โอน, 02 = เลขอ้างอิงรายการ */
export function parseSlipQr(data: string): { transRef: string; bankCode?: string } | null {
  const top = parseTlv(data);
  if (!top["00"]) return null;
  const sub = parseTlv(top["00"]);
  if (!sub["02"]) return null;
  return { transRef: sub["02"], bankCode: sub["01"] };
}

/** หายอดเงินจากข้อความ OCR: เลขรูปแบบ 1,234.56 ที่มากที่สุด (สลิปมักมีค่าธรรมเนียม 0.00 ด้วย) */
export function findAmount(text: string): number | null {
  const nums = [...text.matchAll(/(?<![\d.])(\d{1,3}(?:,\d{3})+|\d+)\.(\d{2})(?![\d])/g)].map((m) =>
    Number(m[1].replace(/,/g, "") + "." + m[2])
  );
  const positive = nums.filter((n) => n > 0);
  return positive.length ? Math.max(...positive) : null;
}

/** หาเลขบัญชี/พร้อมเพย์ที่ถูกปิดบางส่วน เช่น xxx-xxx-7780, xxx-x-x8012-x */
export function findMaskedAccounts(text: string): string[] {
  // OCR มักอ่านขีดเป็น "=" หรือ "=-" จึงยอมให้ตัวคั่นยาว 1–2 ตัว
  return [...text.matchAll(/[xX×\d]{3}[-=–]{1,2}[xX×\d]{1,3}[-=–]{1,2}[xX×\d]{1,5}(?:[-=–]{1,2}[xX×\d])?/g)]
    .map((m) => m[0].replace(/[-=–]+/g, "-").replace(/×/g, "x"))
    .filter((s) => /x/i.test(s) && /\d/.test(s));
}

/** ถอด QR: ลองจากรูปย่อก่อน (เร็ว) ถ้าไม่เจอค่อยใช้รูปเต็ม */
async function readQr(buf: Buffer) {
  for (const width of [1000, 0]) {
    let pipe = sharp(buf).rotate();
    if (width) pipe = pipe.resize({ width, withoutEnlargement: true });
    const { data, info } = await pipe.ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const code = jsQR(new Uint8ClampedArray(data.buffer, data.byteOffset, data.length), info.width, info.height);
    if (code) return parseSlipQr(code.data);
  }
  return null;
}

export async function verifyLocal(file: File, receiverId: string): Promise<SlipResult> {
  const buf = Buffer.from(await file.arrayBuffer());
  const workerReady = getWorker(); // เริ่มเตรียม OCR ไปพร้อมกับอ่าน QR

  // 1) QR บนสลิป
  let qr: Awaited<ReturnType<typeof readQr>> = null;
  try {
    qr = await readQr(buf);
  } catch {
    return { ok: false, reason: "เปิดไฟล์รูปไม่ได้ ลองบันทึกสลิปจากแอปธนาคารแล้วแนบใหม่" };
  }
  if (!qr) {
    return { ok: false, reason: "ไม่พบ QR บนสลิป ใช้รูปสลิปจากแอปธนาคารแบบเต็มใบ ไม่ครอปและไม่ถ่ายหน้าจอซ้อน" };
  }

  // 2) OCR หายอดและบัญชีผู้รับ (กว้าง 1400px พอสำหรับตัวเลขบนสลิป ใหญ่กว่านี้ช้าขึ้นแต่ไม่แม่นขึ้น)
  const img = await sharp(buf).rotate().grayscale().resize({ width: 1400 }).toBuffer();
  const worker = await workerReady;
  const {
    data: { text },
  } = await worker.recognize(img);

  const amount = findAmount(text);
  if (amount === null) return { ok: false, reason: "อ่านยอดเงินบนสลิปไม่ได้ ลองแนบรูปที่ชัดกว่านี้" };

  // เลือกบัญชีที่ตรงกับผู้รับ ถ้าไม่มีให้ส่งตัวสุดท้าย (ส่วนใหญ่ผู้รับอยู่ใต้ผู้โอน) ไปให้กฎตรวจปฏิเสธ
  const accounts = findMaskedAccounts(text);
  const digits = receiverId.replace(/\D/g, "");
  const match = accounts.find((a) => {
    const tail = a.replace(/[^\d]/g, "").slice(-4);
    return tail.length >= 3 && digits.includes(tail);
  });
  const receiverAccount = match ?? accounts.at(-1) ?? "ไม่พบ";

  return { ok: true, transRef: qr.transRef, amount, receiverAccount };
}
