"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { PRESETS, findThaiVoice, playAlert, playAlertSound, type AlertSoundSettings, type SoundPreset } from "@/lib/alert-sound";

type Props = { initial: AlertSoundSettings; hasFile: boolean; serverVoice: string | null };

const SAMPLE = { donorName: "ต้นกล้า", amount: 100, message: "เปิดเพลงที่ขอหน่อยครับ" };
const OWN_URL = "/api/dashboard/alert-sound";

export function SoundSettings({ initial, hasFile, serverVoice }: Props) {
  const router = useRouter();
  const [v, setV] = useState(initial);
  const [fileReady, setFileReady] = useState(hasFile);
  const [fileVer, setFileVer] = useState(0); // เปลี่ยนลิงก์หลังอัปโหลดใหม่ กันเบราว์เซอร์จำไฟล์เก่า
  const [state, setState] = useState<{ kind: "idle" | "saving" | "saved" | "error" | "uploading"; message?: string }>({ kind: "idle" });
  const fileRef = useRef<HTMLInputElement>(null);
  const templateRef = useRef<HTMLInputElement>(null);
  // undefined = กำลังเช็ก, null = เครื่องนี้ไม่มีเสียงไทย
  const [thaiVoice, setThaiVoice] = useState<string | null | undefined>(undefined);
  useEffect(() => {
    findThaiVoice(2500).then((v) => setThaiVoice(v ? v.name : null));
  }, []);

  const withUrl = (s: AlertSoundSettings): AlertSoundSettings => ({ ...s, soundUrl: fileReady ? `${OWN_URL}?v=${fileVer}` : null });
  const update = (patch: Partial<AlertSoundSettings>) => {
    setV((cur) => ({ ...cur, ...patch }));
    if (state.kind !== "uploading") setState({ kind: "idle" });
  };

  async function save() {
    setState({ kind: "saving" });
    const res = await fetch("/api/dashboard/alert-settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(v),
    });
    const json = await res.json().catch(() => ({}));
    setState(res.ok ? { kind: "saved" } : { kind: "error", message: json.message ?? "บันทึกไม่สำเร็จ" });
  }

  async function upload(file: File) {
    setState({ kind: "uploading" });
    const form = new FormData();
    form.append("sound", file);
    const res = await fetch(OWN_URL, { method: "POST", body: form });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      setState({ kind: "error", message: json.message ?? "อัปโหลดไม่สำเร็จ" });
      return;
    }
    setFileReady(true);
    setFileVer((n) => n + 1);
    setV((cur) => ({ ...cur, soundPreset: "custom" }));
    setState({ kind: "saved", message: `อัปโหลด ${json.name} แล้ว และตั้งเป็นเสียงแจ้งเตือน` });
    router.refresh();
  }

  async function removeFile() {
    if (!window.confirm("ลบเสียงที่อัปโหลดไว้?")) return;
    await fetch(OWN_URL, { method: "DELETE" });
    setFileReady(false);
    setV((cur) => ({ ...cur, soundPreset: cur.soundPreset === "custom" ? "chime" : cur.soundPreset }));
    setState({ kind: "saved", message: "ลบเสียงแล้ว กลับไปใช้เสียงติ๊งต่อง" });
    router.refresh();
  }

  function insertVar(token: string) {
    const el = templateRef.current;
    const pos = el?.selectionStart ?? v.ttsTemplate.length;
    const next = v.ttsTemplate.slice(0, pos) + token + v.ttsTemplate.slice(pos);
    update({ ttsTemplate: next.slice(0, 200) });
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(pos + token.length, pos + token.length);
    });
  }

  const options: { id: SoundPreset; label: string }[] = [
    ...PRESETS.filter((p) => p.id !== "none"),
    ...(fileReady ? [{ id: "custom" as const, label: "เสียงของฉัน" }] : []),
    PRESETS.find((p) => p.id === "none")!,
  ];

  return (
    <div>
      <h3 className="mt-6 px-1 text-[13px] text-ink-3">เสียงตอนแจ้งเตือนเด้ง</h3>
      <ul className="group-inset mt-2" role="radiogroup" aria-label="เสียงแจ้งเตือน">
        {options.map((o) => {
          const active = v.soundPreset === o.id;
          return (
            <li key={o.id} className="flex items-center gap-3 px-4 py-3">
              <button
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => update({ soundPreset: o.id })}
                className="flex flex-1 items-center gap-3 text-left"
              >
                <span
                  aria-hidden
                  className={`grid size-5 shrink-0 place-items-center rounded-full border-2 ${active ? "border-red" : "border-line"}`}
                >
                  {active && <span className="size-2.5 rounded-full bg-red" />}
                </span>
                <span className={active ? "font-medium text-ink" : "text-ink"}>{o.label}</span>
              </button>
              {o.id !== "none" && (
                <button
                  type="button"
                  aria-label={`ฟังเสียง${o.label}`}
                  onClick={() => playAlertSound(withUrl({ ...v, soundPreset: o.id }))}
                  className="btn-quiet px-3 py-1.5 text-[14px]"
                >
                  ฟัง
                </button>
              )}
              {o.id === "custom" && (
                <button type="button" onClick={removeFile} className="btn-quiet px-3 py-1.5 text-[14px] text-ink-2 hover:text-red">
                  ลบ
                </button>
              )}
            </li>
          );
        })}
        <li className="px-4 py-3">
          <button
            type="button"
            disabled={state.kind === "uploading"}
            onClick={() => fileRef.current?.click()}
            className="text-[15px] font-medium text-red"
          >
            {state.kind === "uploading" ? "กำลังอัปโหลด…" : fileReady ? "เปลี่ยนไฟล์เสียงของฉัน" : "อัปโหลดเสียงของฉัน"}
          </button>
          <p className="mt-0.5 text-[13px] text-ink-3">MP3, WAV, OGG หรือ M4A ไม่เกิน 1 MB (ประมาณ 10 วินาที)</p>
          <input
            ref={fileRef}
            type="file"
            accept="audio/mpeg,audio/wav,audio/ogg,audio/mp4,audio/x-m4a,audio/aac,audio/webm"
            className="sr-only"
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              if (f) upload(f);
            }}
          />
        </li>
      </ul>

      <div className="group-inset mt-3">
        <Slider label="ความดัง" value={v.soundVolume} min={0} max={100} step={5} suffix="%" onChange={(n) => update({ soundVolume: n })} />
      </div>

      <h3 className="mt-8 px-1 text-[13px] text-ink-3">เสียงอ่านข้อความ</h3>
      <div className="group-inset mt-2">
        <label className="flex cursor-pointer items-center justify-between gap-4 px-4 py-3.5">
          <span>
            <span className="block text-ink">อ่านข้อความโดเนทออกเสียง</span>
            <span className="block text-[13px] text-ink-3">
              {serverVoice ? `เสียงภาษาไทยจากเซิร์ฟเวอร์ (${serverVoice}) เหมือนกันทุกเครื่อง` : "ใช้เสียงภาษาไทยของเครื่องที่เปิด OBS"}
            </span>
          </span>
          <input
            type="checkbox"
            role="switch"
            checked={v.ttsEnabled}
            onChange={(e) => update({ ttsEnabled: e.target.checked })}
            className="peer sr-only"
          />
          <span
            aria-hidden
            className="relative h-[31px] w-[51px] shrink-0 rounded-full bg-fill transition-colors duration-200 peer-checked:bg-red peer-focus-visible:outline-3 peer-focus-visible:outline-red/45 after:absolute after:left-[2px] after:top-[2px] after:size-[27px] after:rounded-full after:bg-white after:shadow-[0_3px_8px_rgb(0_0_0/0.15),0_1px_1px_rgb(0_0_0/0.16)] after:transition-transform after:duration-200 peer-checked:after:translate-x-5"
          />
        </label>
        {v.ttsEnabled && (
          <>
            {serverVoice && (
              <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                <span className="text-ink">แหล่งเสียง</span>
                <Choice
                  label="แหล่งเสียง"
                  value={v.ttsEngine}
                  onChange={(ttsEngine) => update({ ttsEngine })}
                  options={[
                    { v: "auto", label: `เซิร์ฟเวอร์ (${serverVoice})` },
                    { v: "browser", label: "เสียงในเครื่อง" },
                  ]}
                />
              </div>
            )}
            {serverVoice && v.ttsEngine !== "browser" && (
              <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                <span className="text-ink">เสียงผู้อ่าน</span>
                <Choice
                  label="เสียงผู้อ่าน"
                  value={v.ttsVoice}
                  onChange={(ttsVoice) => update({ ttsVoice })}
                  options={[
                    { v: "female", label: "ผู้หญิง" },
                    { v: "male", label: "ผู้ชาย" },
                  ]}
                />
              </div>
            )}
            {(!serverVoice || v.ttsEngine === "browser") && thaiVoice === null && (
              <div className="bg-[#f5a623]/10 px-4 py-3.5 text-[14px]">
                <p className="font-semibold text-ink">เครื่องนี้ยังไม่มีเสียงพูดภาษาไทย</p>
                <p className="mt-1 text-ink-2">
                  ระบบจะข้ามการอ่านข้อความจนกว่าจะติดตั้ง (ไม่งั้นเครื่องจะใช้เสียงอังกฤษอ่าน ฟังไม่รู้เรื่อง) ติดตั้งบนเครื่องที่เปิด OBS:
                </p>
                <ol className="mt-1 list-decimal pl-5 text-ink-2">
                  <li>Windows: Settings → Time &amp; language → Speech → Manage voices → Add voices → เลือก Thai</li>
                  <li>ปิดแล้วเปิด OBS (หรือเบราว์เซอร์) ใหม่ แล้วกลับมาหน้านี้ ข้อความนี้จะหายไป</li>
                </ol>
              </div>
            )}
            {(!serverVoice || v.ttsEngine === "browser") && thaiVoice && (
              <p className="px-4 py-2.5 text-[13px] text-ink-3">เสียงที่ใช้บนเครื่องนี้: {thaiVoice}</p>
            )}
            <div className="px-4 py-3.5">
              <label htmlFor="tts-template" className="block text-ink">
                ประโยคที่อ่าน
              </label>
              <input
                id="tts-template"
                ref={templateRef}
                value={v.ttsTemplate}
                maxLength={200}
                onChange={(e) => update({ ttsTemplate: e.target.value })}
                className="mt-2 block w-full rounded-xl bg-paper px-3 py-2 text-[15px] focus:outline-none focus-visible:ring-2 focus-visible:ring-red/40"
              />
              <div className="mt-2 flex flex-wrap gap-1.5">
                {[
                  ["{name}", "ชื่อคนโดเนท"],
                  ["{amount}", "ยอดเงิน"],
                  ["{message}", "ข้อความ"],
                ].map(([t, label]) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => insertVar(t)}
                    className="rounded-full bg-fill px-3 py-1 text-[13px] text-ink-2 hover:text-ink"
                  >
                    + {label}
                  </button>
                ))}
              </div>
            </div>
            <Slider label="ความเร็ว" value={v.ttsRate} min={0.5} max={1.5} step={0.05} format={(n) => `${n.toFixed(2)}×`} onChange={(n) => update({ ttsRate: n })} />
            <Slider label="ความดัง" value={v.ttsVolume} min={0} max={100} step={5} suffix="%" onChange={(n) => update({ ttsVolume: n })} />
          </>
        )}
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <button type="button" onClick={save} disabled={state.kind === "saving"} className="btn-primary">
          {state.kind === "saving" ? "กำลังบันทึก…" : "บันทึกเสียง"}
        </button>
        <button type="button" onClick={() => playAlert(withUrl(v), SAMPLE)} className="btn-quiet">
          ฟังตัวอย่างทั้งหมด
        </button>
        <p aria-live="polite" className={`text-[15px] ${state.kind === "error" ? "text-red" : "text-ink-2"}`}>
          {state.kind === "saved" && (state.message ?? "บันทึกแล้ว วิดเจ็ตใน OBS ใช้เสียงใหม่ทันที")}
          {state.kind === "error" && state.message}
        </p>
      </div>
    </div>
  );
}

function Slider({
  label,
  value,
  min,
  max,
  step,
  suffix = "",
  format,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  suffix?: string;
  format?: (n: number) => string;
  onChange: (n: number) => void;
}) {
  return (
    <label className="flex items-center gap-4 px-4 py-3.5">
      <span className="w-20 shrink-0 text-ink">{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="min-w-0 flex-1 accent-[var(--color-red)]"
      />
      <span className="w-14 shrink-0 text-right text-[15px] tabular-nums text-ink-2">{format ? format(value) : `${Math.round(value)}${suffix}`}</span>
    </label>
  );
}

function Choice<T extends string>({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: T;
  onChange: (v: T) => void;
  options: { v: T; label: string }[];
}) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex gap-1 rounded-full bg-fill p-1 text-[13px]">
      {options.map((o) => (
        <button
          key={o.v}
          type="button"
          role="radio"
          aria-checked={value === o.v}
          onClick={() => onChange(o.v)}
          className={`rounded-full px-3 py-1 font-medium transition-all ${
            value === o.v ? "bg-chip text-ink shadow-[0_2px_6px_rgb(0_0_0/0.12)]" : "text-ink-2 hover:text-ink"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
