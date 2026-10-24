/**
 * การตั้งค่าเสียงแจ้งเตือน (ตาราง alert_settings) ฝั่งเซิร์ฟเวอร์
 */
import { exec, query, type RowDataPacket } from "./db";
import { DEFAULT_SOUND, PRESETS, type AlertSoundSettings, type SoundPreset } from "./alert-sound";
import { ttsProvider } from "./tts-server";

type Row = RowDataPacket & {
  sound_preset: string;
  sound_file_path: string | null;
  sound_volume: number;
  tts_enabled: number;
  tts_template: string;
  tts_rate: number;
  tts_volume: number;
  tts_voice?: string; // มีหลังรัน 005_tts_voice.sql
  tts_engine?: string;
};

export type StoredSoundSettings = Omit<AlertSoundSettings, "soundUrl" | "ttsServerUrl"> & { soundFile: string | null };

const DEFAULT_STORED: StoredSoundSettings = (({ soundUrl: _u, ttsServerUrl: _t, ...rest }) => ({ ...rest, soundFile: null }))(DEFAULT_SOUND);

const VALID: SoundPreset[] = [...PRESETS.map((p) => p.id), "custom"];

const missingTable = (e: unknown) => (e as { code?: string }).code === "ER_NO_SUCH_TABLE";

export async function getSoundSettings(userId: number): Promise<StoredSoundSettings> {
  let r: Row | undefined;
  try {
    [r] = await query<Row>("SELECT * FROM alert_settings WHERE user_id = ?", [userId]);
  } catch (e) {
    // ยังไม่ได้รัน npm run db:migrate → ใช้ค่าเริ่มต้นไปก่อน หน้าเว็บจะได้ไม่ล่ม
    if (missingTable(e)) return { ...DEFAULT_STORED };
    throw e;
  }
  if (!r) return { ...DEFAULT_STORED };
  return {
    soundPreset: (VALID.includes(r.sound_preset as SoundPreset) ? r.sound_preset : "chime") as SoundPreset,
    soundFile: r.sound_file_path,
    soundVolume: Number(r.sound_volume),
    ttsEnabled: Number(r.tts_enabled) === 1,
    ttsTemplate: r.tts_template,
    ttsRate: Number(r.tts_rate),
    ttsVolume: Number(r.tts_volume),
    ttsVoice: r.tts_voice === "male" ? "male" : "female",
    ttsEngine: r.tts_engine === "browser" ? "browser" : "auto",
  };
}

/**
 * แปลงเป็นค่าที่ส่งให้เบราว์เซอร์ (ไฟล์เสียงเปลี่ยนเป็นลิงก์)
 * widgetToken: ส่งให้ widget ใน OBS · ไม่ส่ง = ใช้ในแดชบอร์ด (ขอเสียงผ่าน session ที่ล็อกอินอยู่)
 */
export function toClient(s: StoredSoundSettings, soundUrl: string | null, widgetToken?: string): AlertSoundSettings {
  const { soundFile, ...rest } = s;
  const hasFile = Boolean(soundFile);
  const server = ttsProvider()
    ? widgetToken
      ? `/api/widget/tts?token=${encodeURIComponent(widgetToken)}`
      : "/api/dashboard/tts"
    : null;
  return {
    ...rest,
    soundPreset: s.soundPreset === "custom" && !hasFile ? "chime" : s.soundPreset,
    soundUrl: hasFile ? soundUrl : null,
    ttsServerUrl: server,
  };
}

const clamp = (n: unknown, lo: number, hi: number, d: number) => {
  const v = Number(n);
  return Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : d;
};

export function sanitize(input: Record<string, unknown>, cur: StoredSoundSettings): StoredSoundSettings {
  const preset = VALID.includes(input.soundPreset as SoundPreset) ? (input.soundPreset as SoundPreset) : cur.soundPreset;
  return {
    soundPreset: preset,
    soundFile: cur.soundFile,
    soundVolume: Math.round(clamp(input.soundVolume, 0, 100, cur.soundVolume)),
    ttsEnabled: input.ttsEnabled === undefined ? cur.ttsEnabled : Boolean(input.ttsEnabled),
    ttsTemplate: String(input.ttsTemplate ?? cur.ttsTemplate).slice(0, 200).trim() || DEFAULT_SOUND.ttsTemplate,
    ttsRate: Math.round(clamp(input.ttsRate, 0.5, 1.5, cur.ttsRate) * 100) / 100,
    ttsVolume: Math.round(clamp(input.ttsVolume, 0, 100, cur.ttsVolume)),
    ttsVoice: input.ttsVoice === "male" || input.ttsVoice === "female" ? input.ttsVoice : cur.ttsVoice,
    ttsEngine: input.ttsEngine === "browser" || input.ttsEngine === "auto" ? input.ttsEngine : cur.ttsEngine,
  };
}

export async function saveSoundSettings(userId: number, s: StoredSoundSettings) {
  try {
    await saveRow(userId, s);
  } catch (e) {
    if (missingTable(e)) throw new Error("ยังไม่มีตาราง alert_settings ให้รัน npm run db:migrate แล้วลองใหม่");
    throw e;
  }
}

async function saveRow(userId: number, s: StoredSoundSettings) {
  try {
    await exec(
      `INSERT INTO alert_settings (user_id, sound_preset, sound_file_path, sound_volume, tts_enabled, tts_template, tts_rate, tts_volume, tts_voice, tts_engine)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE sound_preset = VALUES(sound_preset), sound_file_path = VALUES(sound_file_path),
         sound_volume = VALUES(sound_volume), tts_enabled = VALUES(tts_enabled), tts_template = VALUES(tts_template),
         tts_rate = VALUES(tts_rate), tts_volume = VALUES(tts_volume), tts_voice = VALUES(tts_voice),
         tts_engine = VALUES(tts_engine), updated_at = CURRENT_TIMESTAMP`,
      [userId, s.soundPreset, s.soundFile, s.soundVolume, s.ttsEnabled ? 1 : 0, s.ttsTemplate, s.ttsRate, s.ttsVolume, s.ttsVoice, s.ttsEngine]
    );
    return;
  } catch (e) {
    // ยังไม่ได้รัน 005_tts_voice.sql → บันทึกแบบเดิมไปก่อน (เสียงหญิง/ชายจะยังไม่ถูกจำ)
    if ((e as { code?: string }).code !== "ER_BAD_FIELD_ERROR") throw e;
  }
  await exec(
    `INSERT INTO alert_settings (user_id, sound_preset, sound_file_path, sound_volume, tts_enabled, tts_template, tts_rate, tts_volume)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE sound_preset = VALUES(sound_preset), sound_file_path = VALUES(sound_file_path),
       sound_volume = VALUES(sound_volume), tts_enabled = VALUES(tts_enabled), tts_template = VALUES(tts_template),
       tts_rate = VALUES(tts_rate), tts_volume = VALUES(tts_volume), updated_at = CURRENT_TIMESTAMP`,
    [userId, s.soundPreset, s.soundFile, s.soundVolume, s.ttsEnabled ? 1 : 0, s.ttsTemplate, s.ttsRate, s.ttsVolume]
  );
}

/** ลิงก์ไฟล์เสียงสำหรับ widget (ยืนยันสิทธิ์ด้วย token ของ widget) */
export function widgetSoundUrl(token: string, file: string | null) {
  return file ? `/api/widget/sound?token=${encodeURIComponent(token)}&v=${encodeURIComponent(file.split("/").pop() ?? "")}` : null;
}
