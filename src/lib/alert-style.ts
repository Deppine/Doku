/** รูปแบบแจ้งเตือนบนจอ · card = แบบเก่า (ยังใช้ได้กับคนที่เลือกไว้/ลิงก์ &style=card แต่ไม่โชว์ในตัวเลือกแล้ว) */
export const ALERT_STYLES = ["classic", "neon", "pop", "led", "sign", "announce", "card"] as const;
export type AlertStyle = (typeof ALERT_STYLES)[number];

export function isAlertStyle(v: unknown): v is AlertStyle {
  return typeof v === "string" && (ALERT_STYLES as readonly string[]).includes(v);
}
