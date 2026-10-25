/**
 * รายการโดเนท (ตาราง donations / payment_slips / payment_verifications) + event bus สำหรับ alert
 *
 * สถานะใน DB → สถานะที่หน้าเว็บเห็น
 *   pending, submitted → PENDING   (รอโอน / แนบสลิปแล้วแต่ยังไม่ผ่าน แนบใหม่ได้จนหมดเวลา)
 *   verified           → SUCCESS
 *   expired, rejected, refunded → EXPIRED
 *
 * แจ้งเตือนไป widget ผ่านตาราง widget_events (ใช้ได้กับหลายเครื่อง / Vercel)
 */
import { randomUUID } from "node:crypto";
import { db, exec, query, type RowDataPacket } from "./db";

export type SessionStatus = "PENDING" | "SUCCESS" | "EXPIRED";

export type DonationSession = {
  id: string; // donation_ref
  dbId: number;
  recipientId: number;
  donorName: string;
  message: string;
  amount: number;
  status: SessionStatus;
  createdAt: number; // ms
  expiresAt: number; // ms
};

export type Donation = {
  /** donation_ref เต็ม (completeSession ส่งคืนค่าเดียวกับ ref) */
  id?: string;
  ref: string;
  donorName: string;
  message: string;
  amount: number;
  createdAt: number;
};

export type AlertEvent = {
  type: "donation";
  id: string;
  donorName: string;
  message: string;
  amount: number;
  test?: boolean;
};

const TTL_MIN = Math.max(1, Number(process.env.SESSION_TTL_MINUTES ?? 15));

export async function createSession(input: {
  recipientId: number;
  donorName: string;
  message: string;
  amount: number;
  payload: string;
}) {
  const ref = randomUUID();
  await exec(
    `INSERT INTO donations (donation_ref, recipient_user_id, donor_name, message, expected_amount, status, expires_at, qr_payload)
     VALUES (?, ?, ?, ?, ?, 'pending', DATE_ADD(CURRENT_TIMESTAMP, INTERVAL ? MINUTE), ?)`,
    [ref, input.recipientId, input.donorName, input.message, input.amount, TTL_MIN, input.payload]
  );
  return (await getSession(ref))!;
}

type SessionRow = RowDataPacket & {
  id: number;
  donation_ref: string;
  recipient_user_id: number;
  donor_name: string | null;
  message: string | null;
  expected_amount: number;
  status: string;
  created_ms: number;
  expires_ms: number | null;
  expired_now: number;
};

export async function getSession(ref: string): Promise<DonationSession | undefined> {
  const [r] = await query<SessionRow>(
    `SELECT id, donation_ref, recipient_user_id, donor_name, message, expected_amount, status,
            UNIX_TIMESTAMP(created_at) * 1000 AS created_ms,
            UNIX_TIMESTAMP(expires_at) * 1000 AS expires_ms,
            (expires_at IS NOT NULL AND expires_at < CURRENT_TIMESTAMP) AS expired_now
     FROM donations WHERE donation_ref = ?`,
    [ref]
  );
  if (!r) return undefined;

  let status = r.status;
  if ((status === "pending" || status === "submitted") && Number(r.expired_now) === 1) {
    await exec("UPDATE donations SET status = 'expired' WHERE id = ? AND status IN ('pending','submitted')", [r.id]);
    status = "expired";
  }
  return {
    id: r.donation_ref,
    dbId: Number(r.id),
    recipientId: Number(r.recipient_user_id),
    donorName: r.donor_name ?? "ไม่ระบุชื่อ",
    message: r.message ?? "",
    amount: Number(r.expected_amount),
    status: status === "verified" ? "SUCCESS" : status === "pending" || status === "submitted" ? "PENDING" : "EXPIRED",
    createdAt: Number(r.created_ms),
    expiresAt: Number(r.expires_ms ?? r.created_ms),
  };
}

/** บันทึกไฟล์สลิปที่แนบ และเปลี่ยนสถานะเป็น submitted */
export async function addSlip(dbId: number, file: { originalName: string | null; storedPath: string; hash: string }) {
  const res = await exec(
    "INSERT INTO payment_slips (donation_id, original_file_name, stored_file_path, file_hash) VALUES (?, ?, ?, ?)",
    [dbId, file.originalName, file.storedPath, file.hash]
  );
  await exec("UPDATE donations SET status = 'submitted' WHERE id = ? AND status = 'pending'", [dbId]);
  return res.insertId;
}

/** รูปสลิปไฟล์เดียวกันเคยผ่านการตรวจแล้วหรือยัง (กันส่งรูปซ้ำก่อนเสียเวลาอ่าน) */
export async function isSlipFileUsed(hash: string) {
  const rows = await query<RowDataPacket>(
    `SELECT 1 FROM payment_slips s JOIN payment_verifications v ON v.slip_id = s.id
     WHERE s.file_hash = ? AND v.verification_status = 'verified' LIMIT 1`,
    [hash]
  );
  return rows.length > 0;
}

export async function isTransRefUsed(ref: string) {
  const rows = await query<RowDataPacket>(
    "SELECT 1 FROM payment_verifications WHERE transaction_ref = ? AND verification_status = 'verified' LIMIT 1",
    [ref]
  );
  return rows.length > 0;
}

/**
 * บันทึกผลตรวจสลิป
 * - ไม่ผ่าน: เก็บเหตุผลใน response_code และไม่เก็บเลขอ้างอิง (สลิปนี้ยังใช้กับรายการที่ยอดถูกต้องได้)
 * - ผ่าน: เก็บเลขอ้างอิง (unique ต่อผู้ให้บริการ กันสลิปซ้ำได้แม้ส่งพร้อมกัน)
 */
export async function recordRejected(slipId: number, provider: string, code: string, data?: { amount?: number; receiver?: string }) {
  await exec(
    `INSERT INTO payment_verifications (slip_id, provider, transaction_ref, amount, receiver_promptpay_id, verification_status, response_code)
     VALUES (?, ?, NULL, ?, ?, 'rejected', ?)`,
    [slipId, provider, data?.amount ?? null, data?.receiver ?? null, code.slice(0, 50)]
  );
}

/**
 * ยืนยันรายการ: บันทึกผลตรวจ + เปลี่ยนสถานะ donation เป็น verified + ยิง alert
 * คืน "DUPLICATE" ถ้าเลขอ้างอิงนี้ถูกใช้ไปแล้ว, null ถ้ารายการปิดไปแล้ว
 */
export async function completeSession(
  session: DonationSession,
  verification: { slipId: number; provider: string; transRef: string; amount: number; receiver?: string } | null
): Promise<Donation | "DUPLICATE" | null> {
  const conn = await db().getConnection();
  try {
    await conn.beginTransaction();
    if (verification) {
      try {
        await conn.query(
          `INSERT INTO payment_verifications (slip_id, provider, transaction_ref, amount, receiver_promptpay_id, verification_status, response_code)
           VALUES (?, ?, ?, ?, ?, 'verified', 'OK')`,
          [verification.slipId, verification.provider, verification.transRef, verification.amount, verification.receiver ?? null]
        );
      } catch (e) {
        if ((e as { code?: string }).code === "ER_DUP_ENTRY") {
          await conn.rollback();
          return "DUPLICATE";
        }
        throw e;
      }
    }
    const [res] = await conn.query<import("mysql2").ResultSetHeader>(
      `UPDATE donations SET status = 'verified', paid_amount = ?, verified_at = CURRENT_TIMESTAMP
       WHERE id = ? AND status IN ('pending','submitted')`,
      [verification?.amount ?? session.amount, session.dbId]
    );
    if (res.affectedRows !== 1) {
      await conn.rollback();
      return null;
    }
    await conn.commit();
  } catch (e) {
    await conn.rollback().catch(() => {});
    throw e;
  } finally {
    conn.release();
  }

  await emitAlert(session.recipientId, {
    type: "donation",
    id: session.id,
    donorName: session.donorName,
    message: session.message,
    amount: session.amount,
  }).catch((e) => console.error("ส่งแจ้งเตือนไป widget ไม่สำเร็จ", e)); // โดเนทสำเร็จแล้ว ไม่ให้ผู้โอนเห็น error
  return { ref: session.id, donorName: session.donorName, message: session.message, amount: session.amount, createdAt: Date.now() };
}

export async function listDonations(recipientId: number, limit = 50): Promise<Donation[]> {
  const rows = await query<
    RowDataPacket & { donation_ref: string; donor_name: string | null; message: string | null; paid_amount: number | null; expected_amount: number; ms: number }
  >(
    `SELECT donation_ref, donor_name, message, paid_amount, expected_amount, UNIX_TIMESTAMP(COALESCE(verified_at, created_at)) * 1000 AS ms
     FROM donations WHERE recipient_user_id = ? AND status = 'verified'
     ORDER BY COALESCE(verified_at, created_at) DESC LIMIT ?`,
    [recipientId, limit]
  );
  return rows.map((r) => ({
    id: r.donation_ref,
    ref: r.donation_ref.slice(0, 8).toUpperCase(),
    donorName: r.donor_name ?? "ไม่ระบุชื่อ",
    message: r.message ?? "",
    amount: Number(r.paid_amount ?? r.expected_amount),
    createdAt: Number(r.ms),
  }));
}

export async function donationTotals(recipientId: number) {
  const [r] = await query<RowDataPacket & { total: number | null; n: number }>(
    "SELECT SUM(COALESCE(paid_amount, expected_amount)) AS total, COUNT(*) AS n FROM donations WHERE recipient_user_id = ? AND status = 'verified'",
    [recipientId]
  );
  return { total: Number(r?.total ?? 0), count: Number(r?.n ?? 0) };
}

// ---------- คิวแจ้งเตือน (alert → widget) ----------
// เก็บในตาราง widget_events: ใช้ได้แม้เซิร์ฟเวอร์มีหลายเครื่อง (Vercel)
// widget ดึงรายการที่ id มากกว่าที่เคยเห็นผ่าน /api/widget/stream

export type WidgetEvent = { id: number; kind: "alert" | "settings" | "reload"; payload: unknown };

async function pushEvent(userId: number, kind: WidgetEvent["kind"], payload: unknown) {
  await exec("INSERT INTO widget_events (user_id, kind, payload) VALUES (?, ?, ?)", [userId, kind, JSON.stringify(payload)]);
  // ล้างของเก่าเป็นครั้งคราว
  if (Math.random() < 0.05) await exec("DELETE FROM widget_events WHERE created_at < NOW() - INTERVAL 1 DAY").catch(() => {});
}

export function emitAlert(userId: number, event: AlertEvent) {
  return pushEvent(userId, "alert", event);
}

/** การตั้งค่าเสียงเปลี่ยน → widget ที่เปิดอยู่ได้รับทันที */
export function emitSettings(userId: number, settings: unknown) {
  return pushEvent(userId, "settings", settings);
}

/** id ล่าสุดของผู้ใช้ (widget ที่เพิ่งเปิดจะเริ่มนับจากตรงนี้ ไม่เล่น alert ย้อนหลัง) */
export async function latestEventId(userId: number) {
  const [r] = await query<RowDataPacket & { id: number | null }>("SELECT MAX(id) AS id FROM widget_events WHERE user_id = ?", [userId]);
  return Number(r?.id ?? 0);
}

export async function eventsAfter(userId: number, afterId: number): Promise<WidgetEvent[]> {
  const rows = await query<RowDataPacket & { id: number; kind: WidgetEvent["kind"]; payload: unknown }>(
    // ไม่ส่งของที่ค้างนานเกิน 10 นาที (เช่น OBS ปิดไปนาน) กันแจ้งเตือนเก่าเด้งรัว
    "SELECT id, kind, payload FROM widget_events WHERE user_id = ? AND id > ? AND created_at > NOW() - INTERVAL 10 MINUTE ORDER BY id LIMIT 20",
    [userId, afterId]
  );
  return rows.map((r) => ({ id: Number(r.id), kind: r.kind, payload: typeof r.payload === "string" ? JSON.parse(r.payload) : r.payload }));
}

export async function markWidgetSeen(userId: number) {
  await exec("UPDATE users SET widget_seen_at = NOW() WHERE id = ?", [userId]);
}

/** widget ใน OBS ต่ออยู่ไหม (เห็นภายใน 40 วินาทีล่าสุด) */
export async function widgetOnline(userId: number) {
  const [r] = await query<RowDataPacket & { ok: number }>(
    "SELECT widget_seen_at > NOW() - INTERVAL 40 SECOND AS ok FROM users WHERE id = ?",
    [userId]
  );
  return Number(r?.ok ?? 0) === 1;
}

/**
 * ผู้ดูแลอนุมัติรายการเอง (ระบบอ่านสลิปพลาด แต่ตรวจดูสลิปแล้วเงินเข้าจริง)
 * ใช้ยอดที่ระบุตอนสร้าง QR เป็นยอดที่ได้รับ แล้วส่งแจ้งเตือนขึ้นจอตามปกติ
 */
export async function approveManually(donationId: number, adminId: number): Promise<"OK" | "NOT_FOUND" | "ALREADY" | "NO_SLIP"> {
  const conn = await db().getConnection();
  let info: { ref: string; recipient: number; donor: string | null; message: string | null; amount: number } | null = null;
  try {
    await conn.beginTransaction();
    const [rows] = await conn.query<RowDataPacket[]>(
      "SELECT id, donation_ref, recipient_user_id, donor_name, message, expected_amount, status FROM donations WHERE id = ? FOR UPDATE",
      [donationId]
    );
    const d = rows[0];
    if (!d) {
      await conn.rollback();
      return "NOT_FOUND";
    }
    if (d.status === "verified") {
      await conn.rollback();
      return "ALREADY";
    }
    const [slips] = await conn.query<RowDataPacket[]>("SELECT id FROM payment_slips WHERE donation_id = ? ORDER BY id DESC LIMIT 1", [donationId]);
    if (!slips[0]) {
      await conn.rollback();
      return "NO_SLIP";
    }
    await conn.query(
      `INSERT INTO payment_verifications (slip_id, provider, transaction_ref, amount, verification_status, response_code)
       VALUES (?, 'manual', NULL, ?, 'verified', ?)`,
      [slips[0].id, d.expected_amount, `ADMIN_${adminId}`.slice(0, 50)]
    );
    await conn.query("UPDATE donations SET status = 'verified', paid_amount = expected_amount, verified_at = CURRENT_TIMESTAMP WHERE id = ?", [donationId]);
    await conn.commit();
    info = { ref: d.donation_ref, recipient: Number(d.recipient_user_id), donor: d.donor_name, message: d.message, amount: Number(d.expected_amount) };
  } catch (e) {
    await conn.rollback().catch(() => {});
    throw e;
  } finally {
    conn.release();
  }
  await emitAlert(info.recipient, {
    type: "donation",
    id: info.ref,
    donorName: info.donor ?? "ไม่ระบุชื่อ",
    message: info.message ?? "",
    amount: info.amount,
  }).catch((e) => console.error("ส่งแจ้งเตือนไป widget ไม่สำเร็จ", e));
  return "OK";
}

/** ส่งแจ้งเตือนของรายการเดิมขึ้นจออีกครั้ง (เฉพาะรายการที่ผ่านแล้วของสตรีมเมอร์คนนั้น) */
export async function replayAlert(userId: number, donationRef: string) {
  const [d] = await query<RowDataPacket & { donor_name: string | null; message: string | null; amt: number }>(
    `SELECT donor_name, message, COALESCE(paid_amount, expected_amount) AS amt FROM donations
     WHERE recipient_user_id = ? AND donation_ref = ? AND status = 'verified'`,
    [userId, donationRef]
  );
  if (!d) return false;
  await emitAlert(userId, {
    type: "donation",
    id: `${donationRef}-replay-${Date.now()}`,
    donorName: d.donor_name ?? "ไม่ระบุชื่อ",
    message: d.message ?? "",
    amount: Number(d.amt),
  });
  return true;
}
