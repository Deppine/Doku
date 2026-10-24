/**
 * ข้อมูลสตรีมเมอร์ จากตาราง users + payment_settings
 */
import { query, exec, type RowDataPacket } from "./db";

export type Streamer = {
  id: number;
  username: string;
  displayName: string;
  bio: string;
  widgetToken: string;
  // จาก payment_settings (null = ยังไม่ได้ตั้งค่าบัญชีรับเงิน)
  promptpayId: string | null;
  promptpayName: string | null;
  minAmount: number;
  presets: number[];
  allowCustomAmount: boolean;
};

type Row = RowDataPacket & {
  id: number;
  username: string;
  display_name: string;
  bio: string;
  widget_token: string | null;
  promptpay_id: string | null;
  account_name: string | null;
  min_amount: number | null;
  presets: string | null;
  allow_custom_amount: number | null;
};

const SELECT = `
  SELECT u.id, u.username, u.display_name, u.bio, u.widget_token,
         p.promptpay_id, p.account_name, p.min_amount, p.presets, p.allow_custom_amount
  FROM users u LEFT JOIN payment_settings p ON p.user_id = u.id`;

function map(r: Row): Streamer {
  return {
    id: Number(r.id),
    username: r.username,
    displayName: r.display_name,
    bio: r.bio ?? "",
    widgetToken: r.widget_token ?? "",
    promptpayId: r.promptpay_id,
    promptpayName: r.account_name,
    minAmount: r.min_amount ?? 10,
    presets: (r.presets ?? "20,50,100,300,500")
      .split(",")
      .map(Number)
      .filter((n) => Number.isFinite(n) && n > 0),
    allowCustomAmount: r.allow_custom_amount !== 0,
  };
}

/** สตรีมเมอร์ที่ตั้งค่าบัญชีรับเงินแล้ว (โชว์ในหน้ารายชื่อ) */
export async function getStreamers() {
  const rows = await query<Row>(`${SELECT} WHERE p.promptpay_id IS NOT NULL ORDER BY u.id`);
  return rows.map(map);
}

export async function findStreamer(username: string) {
  const [r] = await query<Row>(`${SELECT} WHERE u.username = ?`, [username.toLowerCase()]);
  return r ? map(r) : undefined;
}

export async function findStreamerById(id: number) {
  const [r] = await query<Row>(`${SELECT} WHERE u.id = ?`, [id]);
  return r ? map(r) : undefined;
}

export async function findStreamerByWidgetToken(token: string) {
  if (!token) return undefined;
  const [r] = await query<Row>(`${SELECT} WHERE u.widget_token = ?`, [token]);
  return r ? map(r) : undefined;
}

export type StreamerSettings = {
  displayName: string;
  bio: string;
  promptpayId: string;
  promptpayName: string;
  minAmount: number;
  presets: number[];
  allowCustomAmount: boolean;
};

export async function updateStreamer(id: number, s: StreamerSettings) {
  await exec("UPDATE users SET display_name = ?, bio = ? WHERE id = ?", [s.displayName, s.bio, id]);
  await exec(
    `INSERT INTO payment_settings (user_id, account_name, promptpay_id, qr_file_path, min_amount, presets, allow_custom_amount, updated_at)
     VALUES (?, ?, ?, '', ?, ?, ?, CURRENT_TIMESTAMP)
     ON DUPLICATE KEY UPDATE account_name = VALUES(account_name), promptpay_id = VALUES(promptpay_id),
       min_amount = VALUES(min_amount), presets = VALUES(presets),
       allow_custom_amount = VALUES(allow_custom_amount), updated_at = CURRENT_TIMESTAMP`,
    [id, s.promptpayName, s.promptpayId, s.minAmount, s.presets.join(","), s.allowCustomAmount ? 1 : 0]
  );
  return findStreamerById(id);
}

export async function regenerateWidgetToken(id: number) {
  const { randomBytes } = await import("node:crypto");
  const token = randomBytes(24).toString("hex");
  await exec("UPDATE users SET widget_token = ? WHERE id = ?", [token, id]);
  return token;
}
