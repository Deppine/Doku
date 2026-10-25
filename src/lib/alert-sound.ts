/**
 * เสียงแจ้งเตือน (ใช้ฝั่งเบราว์เซอร์: widget OBS + ปุ่มฟังตัวอย่างในแดชบอร์ด)
 * เสียงสำเร็จรูปสร้างด้วย Web Audio ไม่ต้องมีไฟล์เสียง
 */
import { baht } from "./format";

export type SoundPreset = "chime" | "bell" | "coin" | "pop" | "custom" | "none";

export type AlertSoundSettings = {
  soundPreset: SoundPreset;
  soundUrl: string | null; // ลิงก์ไฟล์เสียงที่อัปโหลดเอง
  soundVolume: number; // 0–100
  ttsEnabled: boolean;
  ttsTemplate: string;
  ttsRate: number; // 0.5–1.5
  ttsVolume: number; // 0–100
  ttsVoice: "female" | "male";
  /** auto = ใช้เสียงจากเซิร์ฟเวอร์ถ้าตั้งค่าไว้ ไม่งั้นใช้เสียงในเครื่อง · browser = เสียงในเครื่องเสมอ */
  ttsEngine: "auto" | "browser";
  /** ลิงก์ขอไฟล์เสียงอ่านจากเซิร์ฟเวอร์ (null = ใช้เสียงในเครื่อง) */
  ttsServerUrl: string | null;
};

export const DEFAULT_SOUND: AlertSoundSettings = {
  soundPreset: "chime",
  soundUrl: null,
  soundVolume: 70,
  ttsEnabled: true,
  ttsTemplate: "{name} โดเนท {amount} บาท {message}",
  ttsRate: 1,
  ttsVolume: 100,
  ttsVoice: "female",
  ttsEngine: "auto",
  ttsServerUrl: null,
};

export const PRESETS: { id: Exclude<SoundPreset, "custom">; label: string }[] = [
  { id: "chime", label: "ติ๊งต่อง" },
  { id: "bell", label: "ระฆัง" },
  { id: "coin", label: "เหรียญ" },
  { id: "pop", label: "ป๊อป" },
  { id: "none", label: "ไม่มีเสียง" },
];

type Note = { f: number; t: number; d: number; type?: OscillatorType; g?: number };

const NOTES: Record<string, Note[]> = {
  chime: [
    { f: 880, t: 0, d: 0.6 },
    { f: 1318.5, t: 0.12, d: 0.65 },
  ],
  bell: [
    { f: 1046.5, t: 0, d: 1.6, g: 0.9 },
    { f: 2093, t: 0, d: 1.1, g: 0.35 },
    { f: 3136, t: 0, d: 0.7, g: 0.15 },
  ],
  coin: [
    { f: 988, t: 0, d: 0.09, type: "square", g: 0.45 },
    { f: 1319, t: 0.08, d: 0.5, type: "square", g: 0.45 },
  ],
  pop: [{ f: 520, t: 0, d: 0.16, type: "triangle", g: 1 }],
};

// บันทึกสถานะเสียง (แสดงบนวิดเจ็ตเมื่อเปิด ?debug=1)
let logFn: ((msg: string) => void) | null = null;
export function setAudioLogger(fn: ((msg: string) => void) | null) {
  logFn = fn;
}
const log = (msg: string) => logFn?.(msg);

let ctx: AudioContext | null = null;
function audio() {
  const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  ctx ??= new Ctx();
  if (ctx.state === "suspended") ctx.resume().catch(() => {});
  return ctx;
}

function playNotes(notes: Note[], volume: number) {
  const ac = audio();
  const master = (volume / 100) * 0.35;
  for (const n of notes) {
    const o = ac.createOscillator();
    const g = ac.createGain();
    o.type = n.type ?? "sine";
    o.frequency.value = n.f;
    const t = ac.currentTime + n.t;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(master * (n.g ?? 0.7), t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + n.d);
    o.connect(g).connect(ac.destination);
    o.start(t);
    o.stop(t + n.d + 0.05);
  }
}

/** เล่นเสียงแจ้งเตือน คืน Promise ที่จบเมื่อเสียงเล่นจบ (โดยประมาณ) เพื่อให้เสียงอ่านตามหลัง */
export function playAlertSound(s: AlertSoundSettings): Promise<void> {
  try {
    if (s.soundVolume <= 0 || s.soundPreset === "none") return Promise.resolve();
    log(`เล่นเสียงแจ้งเตือน: ${s.soundPreset}${s.soundPreset === "custom" ? "" : ` (Web Audio ${audio().state})`}`);
    if (s.soundPreset === "custom" && s.soundUrl) {
      const el = new Audio(s.soundUrl);
      el.volume = Math.min(1, s.soundVolume / 100);
      return new Promise((resolve) => {
        const done = () => resolve();
        el.addEventListener("ended", done, { once: true });
        el.addEventListener("error", done, { once: true });
        setTimeout(done, 12_000); // กันไฟล์ยาวเกินไปบล็อกเสียงอ่าน
        el.play().catch(done);
      });
    }
    const notes = NOTES[s.soundPreset] ?? NOTES.chime;
    playNotes(notes, s.soundVolume);
    const len = Math.max(...notes.map((n) => n.t + n.d));
    return new Promise((r) => setTimeout(r, Math.min(len, 0.8) * 1000));
  } catch {
    return Promise.resolve();
  }
}

export function ttsText(template: string, d: { donorName: string; amount: number; message: string }) {
  return template
    .replaceAll("{name}", d.donorName)
    .replaceAll("{amount}", baht(d.amount))
    .replaceAll("{message}", d.message)
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * หาเสียงพูดภาษาไทยในเครื่อง (รายชื่อเสียงโหลดแบบ async รอได้ไม่เกิน ~1.5 วินาที)
 * ไม่มี → null: เครื่องนี้ยังไม่ได้ติดตั้งเสียงภาษาไทย
 */
export function findThaiVoice(timeoutMs = 1500): Promise<SpeechSynthesisVoice | null> {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return Promise.resolve(null);
  const pick = () => window.speechSynthesis.getVoices().find((v) => v.lang?.toLowerCase().replace("_", "-").startsWith("th")) ?? null;
  const now = pick();
  if (now || window.speechSynthesis.getVoices().length > 0) return Promise.resolve(now);
  return new Promise((resolve) => {
    const done = () => {
      window.speechSynthesis.removeEventListener("voiceschanged", done);
      clearTimeout(timer);
      resolve(pick());
    };
    const timer = setTimeout(done, timeoutMs);
    window.speechSynthesis.addEventListener("voiceschanged", done);
  });
}

/**
 * อ่านข้อความด้วยเสียงภาษาไทยเท่านั้น
 * ถ้าเครื่องไม่มีเสียงไทย จะไม่อ่าน (เดิมเบราว์เซอร์จะใช้เสียงอังกฤษแทน อ่านได้แค่ตัวเลข/คำอังกฤษ ฟังไม่รู้เรื่อง)
 * คืน false เมื่อไม่ได้อ่าน
 */
export async function speak(text: string, s: Pick<AlertSoundSettings, "ttsRate" | "ttsVolume">): Promise<boolean> {
  try {
    if (!text || !("speechSynthesis" in window) || s.ttsVolume <= 0) return false;
    const thai = await findThaiVoice();
    if (!thai) {
      console.warn("[Doku] เครื่องนี้ไม่มีเสียงพูดภาษาไทย จึงข้ามการอ่านข้อความ");
      return false;
    }
    const u = new SpeechSynthesisUtterance(text);
    u.lang = thai.lang || "th-TH";
    u.voice = thai;
    u.rate = s.ttsRate;
    u.volume = Math.min(1, s.ttsVolume / 100);
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
    return true;
  } catch {
    return false;
  }
}

/**
 * อ่านด้วยเสียงที่เซิร์ฟเวอร์สร้าง (Google/Azure) — เสียงเหมือนกันทุกเครื่อง
 * คืน false ถ้าขอเสียงไม่สำเร็จ (ให้ไปใช้เสียงในเครื่องแทน)
 */
export async function speakServer(url: string, text: string, s: Pick<AlertSoundSettings, "ttsRate" | "ttsVolume" | "ttsVoice">) {
  try {
    if (!text || s.ttsVolume <= 0) return true;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, voice: s.ttsVoice, rate: s.ttsRate }),
    });
    log(`ขอเสียงอ่าน: ${res.status}`);
    if (!res.ok) return false;
    const data = await res.arrayBuffer();
    const volume = Math.min(1, s.ttsVolume / 100);

    // เล่นผ่าน Web Audio ก่อน (เส้นทางเดียวกับเสียงแจ้งเตือน) ไม่ได้ค่อยใช้ <audio>
    try {
      const ac = audio();
      const buf = await ac.decodeAudioData(data.slice(0));
      const src = ac.createBufferSource();
      const gain = ac.createGain();
      gain.gain.value = volume;
      src.buffer = buf;
      src.connect(gain).connect(ac.destination);
      log(`เล่นเสียงอ่าน (Web Audio ${ac.state}) ${buf.duration.toFixed(1)} วินาที`);
      await new Promise<void>((resolve) => {
        src.onended = () => resolve();
        setTimeout(resolve, (buf.duration + 2) * 1000);
        src.start();
      });
      return true;
    } catch (e) {
      log(`Web Audio ใช้ไม่ได้: ${(e as Error).name} → ลอง <audio>`);
    }

    const blobUrl = URL.createObjectURL(new Blob([data], { type: "audio/mpeg" }));
    const el = new Audio(blobUrl);
    el.volume = volume;
    await new Promise<void>((resolve) => {
      const done = () => {
        URL.revokeObjectURL(blobUrl);
        resolve();
      };
      el.addEventListener("ended", done, { once: true });
      el.addEventListener("error", () => (log(`<audio> error ${el.error?.code ?? ""}`), done()), { once: true });
      setTimeout(done, 30_000);
      el.play().then(
        () => log("เล่นเสียงอ่าน (<audio>)"),
        (e) => (log(`<audio> เล่นไม่ได้: ${(e as Error).name}`), done())
      );
    });
    return true;
  } catch (e) {
    log(`เสียงอ่านจากเซิร์ฟเวอร์ล้มเหลว: ${(e as Error).message}`);
    return false;
  }
}

/** เล่นครบชุด: เสียงแจ้งเตือน แล้วตามด้วยเสียงอ่านข้อความ */
export async function playAlert(s: AlertSoundSettings, d: { donorName: string; amount: number; message: string }, ttsAllowed = true) {
  // ขอเสียงอ่านจากเซิร์ฟเวอร์ไปพร้อมกับเล่นเสียงแจ้งเตือน จะได้ไม่ต้องรอนาน
  const text = s.ttsEnabled && ttsAllowed ? ttsText(s.ttsTemplate, d) : "";
  await playAlertSound(s);
  if (!text) return;
  if (s.ttsServerUrl && s.ttsEngine !== "browser" && (await speakServer(s.ttsServerUrl, text, s))) return;
  log(s.ttsServerUrl ? "ใช้เสียงในเครื่องแทน (เซิร์ฟเวอร์ไม่สำเร็จ)" : "ใช้เสียงในเครื่อง (ไม่ได้ตั้งเสียงเซิร์ฟเวอร์)");
  const ok = await speak(text, s);
  if (!ok) log("เครื่องนี้ไม่มีเสียงไทย ข้ามการอ่าน");
}
