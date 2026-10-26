/** ยอดโดเนทสูงสุดต่อครั้ง (บาท) */
export const MAX_DONATION = 1_000_000;

/** ความยาวข้อความโดเนทที่ขึ้นจอ (ตัวอักษร) */
export const MAX_MESSAGE = 100;

export const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || "Doku";

export function baht(n: number) {
  return new Intl.NumberFormat("th-TH", { maximumFractionDigits: 2 }).format(n);
}
