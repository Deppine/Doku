/**
 * สร้าง PromptPay QR payload ตามมาตรฐาน EMVCo (Thai QR Payment)
 * รองรับ: เบอร์มือถือ (10 หลัก), เลขบัตรประชาชน/เลขผู้เสียภาษี (13 หลัก), e-Wallet (15 หลัก)
 */

const AID_PROMPTPAY = "A000000677010111";

function tlv(id: string, value: string): string {
  return id + value.length.toString().padStart(2, "0") + value;
}

/** CRC16-CCITT (poly 0x1021, init 0xFFFF) */
export function crc16(input: string): string {
  let crc = 0xffff;
  for (let i = 0; i < input.length; i++) {
    crc ^= input.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      crc = crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1;
      crc &= 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

function formatTarget(id: string): { tag: string; value: string } {
  const digits = id.replace(/\D/g, "");
  if (digits.length >= 15) return { tag: "03", value: digits };
  if (digits.length >= 13) return { tag: "02", value: digits };
  // เบอร์มือถือ: 0812345678 -> 0066812345678
  const phone = ("0000000000000" + digits.replace(/^0/, "66")).slice(-13);
  return { tag: "01", value: phone };
}

export function buildPromptPayPayload(promptpayId: string, amount?: number): string {
  const target = formatTarget(promptpayId);
  const merchant = tlv("00", AID_PROMPTPAY) + tlv(target.tag, target.value);

  let data =
    tlv("00", "01") +
    tlv("01", amount ? "12" : "11") + // 12 = ใช้ครั้งเดียว (มียอด), 11 = ใช้ซ้ำได้
    tlv("29", merchant) +
    tlv("53", "764") + // THB
    (amount ? tlv("54", amount.toFixed(2)) : "") +
    tlv("58", "TH");

  data += "6304";
  return data + crc16(data);
}

export function maskPromptPay(id: string): string {
  const d = id.replace(/\D/g, "");
  if (d.length <= 4) return d;
  return "x".repeat(d.length - 4).replace(/(.{3})/g, "$1-").replace(/-$/, "") + "-" + d.slice(-4);
}

/** ตรวจรูปแบบพร้อมเพย์ คืนค่าตัวเลขล้วน หรือข้อความ error */
export function validatePromptPayId(input: string): { ok: true; value: string; type: "phone" | "citizen" | "ewallet" } | { ok: false; message: string } {
  const d = input.replace(/\D/g, "");
  if (/^0[689]\d{8}$/.test(d)) return { ok: true, value: d, type: "phone" };
  if (d.length === 13) {
    // checksum เลขบัตรประชาชน / เลขผู้เสียภาษี
    let sum = 0;
    for (let i = 0; i < 12; i++) sum += Number(d[i]) * (13 - i);
    if ((11 - (sum % 11)) % 10 === Number(d[12])) return { ok: true, value: d, type: "citizen" };
    return { ok: false, message: "เลขบัตรประชาชนไม่ถูกต้อง ตรวจตัวเลขอีกครั้ง" };
  }
  if (d.length === 15) return { ok: true, value: d, type: "ewallet" };
  return { ok: false, message: "ใส่เบอร์มือถือ 10 หลัก เลขบัตรประชาชน 13 หลัก หรือเลข e-Wallet 15 หลัก" };
}
