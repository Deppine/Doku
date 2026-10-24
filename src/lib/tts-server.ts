/**
 * สร้างเสียงอ่านภาษาไทยฝั่งเซิร์ฟเวอร์ (ไม่ต้องพึ่งเสียงที่ติดตั้งใน Windows/OBS)
 *
 * Google Cloud Text-to-Speech:  GOOGLE_TTS_API_KEY=...
 *   (เปลี่ยนเสียงได้ด้วย GOOGLE_TTS_VOICE_FEMALE / GOOGLE_TTS_VOICE_MALE)
 * Azure Speech:                 AZURE_SPEECH_KEY=...  AZURE_SPEECH_REGION=southeastasia
 *   (เปลี่ยนเสียงได้ด้วย AZURE_TTS_VOICE_FEMALE / AZURE_TTS_VOICE_MALE)
 * เลือกเจ้าเองได้ด้วย TTS_PROVIDER=google|azure|off (ไม่ตั้ง = ใช้เจ้าที่มี key)
 * TTS_MAX_CHARS = จำนวนตัวอักษรสูงสุดที่อ่านต่อครั้ง (ค่าเริ่มต้น 160) กันข้อความยาวเปลืองโควตา
 */
import { createHash } from "node:crypto";

export type TtsVoice = "female" | "male";
export type TtsProvider = "google" | "azure";

export const PROVIDER_LABEL: Record<TtsProvider, string> = { google: "Google", azure: "Azure" };

export function ttsProvider(): TtsProvider | null {
  const forced = process.env.TTS_PROVIDER?.toLowerCase();
  if (forced === "off") return null;
  const google = Boolean(process.env.GOOGLE_TTS_API_KEY);
  const azure = Boolean(process.env.AZURE_SPEECH_KEY && process.env.AZURE_SPEECH_REGION);
  if (forced === "google") return google ? "google" : null;
  if (forced === "azure") return azure ? "azure" : null;
  return google ? "google" : azure ? "azure" : null;
}

export function maxChars() {
  const n = Number(process.env.TTS_MAX_CHARS);
  return Number.isFinite(n) && n >= 20 ? Math.min(n, 1000) : 160;
}

/** ตัดช่องว่าง/ตัวควบคุม และความยาวเกิน */
export function cleanText(raw: unknown) {
  return String(raw ?? "")
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxChars());
}

// เก็บเสียงที่เพิ่งสร้างไว้ในหน่วยความจำ (กดทดสอบซ้ำ ๆ ไม่เปลืองโควตา)
const g = globalThis as unknown as { __ttsCache?: Map<string, Buffer> };
const cache = g.__ttsCache ?? (g.__ttsCache = new Map());

export async function synthesize(text: string, voice: TtsVoice, rate: number): Promise<Buffer> {
  const provider = ttsProvider();
  if (!provider) throw new Error("TTS_NOT_CONFIGURED");
  const r = Math.min(1.5, Math.max(0.5, Number(rate) || 1));
  const key = createHash("sha1").update(`${provider}|${voice}|${r}|${text}`).digest("hex");
  const hit = cache.get(key);
  if (hit) return hit;

  const audio = provider === "google" ? await google(text, voice, r) : await azure(text, voice, r);
  cache.set(key, audio);
  if (cache.size > 40) cache.delete(cache.keys().next().value!);
  return audio;
}

// ---------- Google ----------
async function google(text: string, voice: TtsVoice, rate: number) {
  const female = process.env.GOOGLE_TTS_VOICE_FEMALE || "th-TH-Standard-A";
  const male = process.env.GOOGLE_TTS_VOICE_MALE || "th-TH-Chirp3-HD-Charon";
  const endpoint = process.env.GOOGLE_TTS_ENDPOINT || "https://texttospeech.googleapis.com/v1/text:synthesize";
  const call = async (name: string, withRate: boolean) => {
    const res = await fetch(`${endpoint}?key=${encodeURIComponent(process.env.GOOGLE_TTS_API_KEY!)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        input: { text },
        voice: { languageCode: "th-TH", name },
        audioConfig: { audioEncoding: "MP3", ...(withRate ? { speakingRate: rate } : {}) },
      }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) throw new Error(`GOOGLE_${res.status}: ${(await res.text()).slice(0, 200)}`);
    const json = (await res.json()) as { audioContent?: string };
    if (!json.audioContent) throw new Error("GOOGLE_EMPTY");
    return Buffer.from(json.audioContent, "base64");
  };
  const name = voice === "male" ? male : female;
  try {
    return await call(name, true);
  } catch (e) {
    // บางเสียงไม่รองรับปรับความเร็ว / เสียงผู้ชายใช้ไม่ได้ → ลองแบบอื่นก่อนยอมแพ้
    console.warn("[tts] google", (e as Error).message);
    try {
      return await call(name, false);
    } catch {
      if (name !== female) return call(female, true);
      throw e;
    }
  }
}

// ---------- Azure ----------
const xml = (s: string) => s.replace(/[<>&'"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" })[c]!);

async function azure(text: string, voice: TtsVoice, rate: number) {
  const name =
    voice === "male" ? process.env.AZURE_TTS_VOICE_MALE || "th-TH-NiwatNeural" : process.env.AZURE_TTS_VOICE_FEMALE || "th-TH-PremwadeeNeural";
  const pct = Math.round((rate - 1) * 100);
  const ssml = `<speak version="1.0" xml:lang="th-TH"><voice name="${xml(name)}"><prosody rate="${pct >= 0 ? "+" : ""}${pct}%">${xml(text)}</prosody></voice></speak>`;
  const res = await fetch(`https://${process.env.AZURE_SPEECH_REGION}.tts.speech.microsoft.com/cognitiveservices/v1`, {
    method: "POST",
    headers: {
      "Ocp-Apim-Subscription-Key": process.env.AZURE_SPEECH_KEY!,
      "Content-Type": "application/ssml+xml",
      "X-Microsoft-OutputFormat": "audio-24khz-48kbitrate-mono-mp3",
      "User-Agent": "doku",
    },
    body: ssml,
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`AZURE_${res.status}: ${(await res.text()).slice(0, 200)}`);
  return Buffer.from(await res.arrayBuffer());
}
