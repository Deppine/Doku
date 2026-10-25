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
  alert_style?: string; // มีหลังรัน 008
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
    alertStyle: r.alert_style === "card" ? "card" : "classic",
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
    alertStyle: input.alertStyle === "card" || input.alertStyle === "classic" ? input.alertStyle : cur.alertStyle,
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

/**
 * บันทึกการตั้งค่า: ลองคอลัมน์ครบก่อน ถ้าฐานข้อมูลยังไม่ได้ migrate บางไฟล์ ค่อยตัดคอลัมน์ใหม่ทิ้งทีละชุด
 * (เว็บใช้ต่อได้ ค่าที่ยังไม่มีคอลัมน์จะยังไม่ถูกจำ)
 */
async function saveRow(userId: number, s: StoredSoundSettings) {
  const base: [string, unknown][] = [
    ["sound_preset", s.soundPreset],
    ["sound_file_path", s.soundFile],
    ["sound_volume", s.soundVolume],
    ["tts_enabled", s.ttsEnabled ? 1 : 0],
    ["tts_template", s.ttsTemplate],
    ["tts_rate", s.ttsRate],
    ["tts_volume", s.ttsVolume],
  ];
  const tts: [string, unknown][] = [
    ["tts_voice", s.ttsVoice],
    ["tts_engine", s.ttsEngine],
  ];
  const style: [string, unknown][] = [["alert_style", s.alertStyle]]; // 008
  const attempts = [[...base, ...tts, ...style], [...base, ...tts], base];
  for (let i = 0; i < attempts.length; i++) {
    const cols = attempts[i];
    try {
      await exec(
        `INSERT INTO alert_settings (user_id, ${cols.map(([c]) => c).join(", ")}) VALUES (?, ${cols.map(() => "?").join(", ")})
         ON DUPLICATE KEY UPDATE ${cols.map(([c]) => `${c} = VALUES(${c})`).join(", ")}, updated_at = CURRENT_TIMESTAMP`,
        [userId, ...cols.map(([, v]) => v)]
      );
      return;
    } catch (e) {
      if ((e as { code?: string }).code !== "ER_BAD_FIELD_ERROR" || i === attempts.length - 1) throw e;
    }
  }
}

/** ลิงก์ไฟล์เสียงสำหรับ widget (ยืนยันสิทธิ์ด้วย token ของ widget) */
export function widgetSoundUrl(token: string, file: string | null) {
  return file ? `/api/widget/sound?token=${encodeURIComponent(token)}&v=${encodeURIComponent(file.split("/").pop() ?? "")}` : null;
}
