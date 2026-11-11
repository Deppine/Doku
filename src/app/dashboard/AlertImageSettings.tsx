"use client";

import { useEffect, useRef, useState } from "react";
import type { AlertImageAnim, AlertImageSize } from "@/lib/alert-sound";
import { STICKERS, STICKER_IDS, type StickerId } from "@/lib/stickers";
import { DoguSticker } from "@/components/DoguSticker";

type Sticker = StickerId | "random" | null;

const SIZES: { id: AlertImageSize; label: string }[] = [
  { id: "s", label: "เล็ก" },
  { id: "m", label: "กลาง" },
  { id: "l", label: "ใหญ่" },
];
const ANIMS: { id: AlertImageAnim; label: string }[] = [
  { id: "pop", label: "เด้ง" },
  { id: "rise", label: "ลอยขึ้น" },
  { id: "zoom", label: "ซูม" },
];
// แบบที่ใส่รูปได้ · แบบเก่าที่เลิกให้เลือกแล้วไม่รองรับรูป
const SUPPORTED = ["classic", "sign", "announce"];
const WHERE: Record<string, string> = {
  classic: "รูปจะขึ้นเหนือชื่อและยอดเงิน",
  sign: "รูปจะโผล่จากมุมจอแทนโดกู พร้อมป้ายขอบคุณ",
  announce: "รูปจะอยู่ในแถบประกาศแทนโดกู",
};

/** รูป/GIF ประกอบแจ้งเตือน: เลือกสติกเกอร์โดกูจากคลัง หรืออัปโหลดเอง · เลือกขนาด/ท่าเข้า พร้อมตัวอย่างจากวิดเจ็ตจริง */
export function AlertImageSettings({
  initial,
  style: initialStyle,
}: {
  initial: { url: string | null; sticker: Sticker; size: AlertImageSize; anim: AlertImageAnim };
  style: string;
}) {
  const [style, setStyle] = useState(initialStyle);
  const [url, setUrl] = useState(initial.url);
  const [sticker, setSticker] = useState<Sticker>(initial.sticker);
  const [tab, setTab] = useState<"library" | "upload">(initial.sticker || !initial.url ? "library" : "upload");
  const [size, setSize] = useState(initial.size);
  const [anim, setAnim] = useState(initial.anim);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [play, setPlay] = useState(0);
  const input = useRef<HTMLInputElement>(null);

  // เปลี่ยนรูปแบบแจ้งเตือนด้านบน → ตัวอย่างนี้เปลี่ยนตาม
  useEffect(() => {
    const on = (e: Event) => {
      setStyle(String((e as CustomEvent).detail));
      setPlay((n) => n + 1);
    };
    window.addEventListener("doku:alert-style", on);
    return () => window.removeEventListener("doku:alert-style", on);
  }, []);

  // สติกเกอร์มาก่อนรูปที่อัปโหลด (ตรงกับที่วิดเจ็ตแสดง)
  const q = new URLSearchParams({ style, size, anim, ...(sticker ? { sticker } : url ? { img: url } : {}) });
  const using = sticker
    ? sticker === "random"
      ? "สติกเกอร์โดกู · สุ่มท่าทุกครั้ง"
      : `สติกเกอร์โดกู · ${STICKERS[sticker].label}`
    : url
      ? "รูปที่อัปโหลดเอง"
      : "ไม่มีรูป (แสดงแบบเดิม)";

  function note(ok: boolean, text: string) {
    setMsg({ ok, text });
    if (ok) setTimeout(() => setMsg(null), 2500);
  }

  async function upload(file: File) {
    if (file.size > 3 * 1024 * 1024) return note(false, "ไฟล์ใหญ่เกิน 3 MB ลองย่อขนาดหรือลดจำนวนเฟรมของ GIF");
    setBusy(true);
    const form = new FormData();
    form.append("image", file);
    const res = await fetch("/api/dashboard/alert-image", { method: "POST", body: form });
    const json = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return note(false, json.message ?? "อัปโหลดไม่สำเร็จ");
    setUrl(json.url);
    setSticker(null); // อัปโหลดใหม่ = ใช้รูปนี้แทนสติกเกอร์
    setPlay((n) => n + 1);
    note(true, "บันทึกแล้ว วิดเจ็ตใน OBS ใช้รูปใหม่ทันที");
  }

  async function remove() {
    setBusy(true);
    const res = await fetch("/api/dashboard/alert-image", { method: "DELETE" });
    setBusy(false);
    if (!res.ok) return note(false, "ลบไม่สำเร็จ");
    setUrl(null);
    note(true, "เอารูปออกแล้ว");
  }

  async function save(next: { alertImageSize?: AlertImageSize; alertImageAnim?: AlertImageAnim; alertSticker?: Sticker }) {
    if (next.alertImageSize) setSize(next.alertImageSize);
    if (next.alertImageAnim) setAnim(next.alertImageAnim);
    if (next.alertSticker !== undefined) setSticker(next.alertSticker);
    setPlay((n) => n + 1);
    const res = await fetch("/api/dashboard/alert-settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(next),
    });
    if (!res.ok) note(false, ((await res.json().catch(() => ({}))) as { message?: string }).message ?? "บันทึกไม่สำเร็จ");
  }

  return (
    <div>
      {SUPPORTED.includes(style) ? (
        <p className="mb-3 text-[13px] text-ink-2">{WHERE[style]}</p>
      ) : (
        <p className="mb-3 rounded-xl bg-red/10 px-3 py-2 text-[13px] text-red">
          รูปแบบที่เลือกอยู่เป็นแบบเก่า ไม่รองรับรูป · เปลี่ยนเป็นตัวอักษรกลางจอ โดกูชูป้าย หรือโดกูประกาศ
        </p>
      )}

      {/* ตัวอย่าง: หน้าวิดเจ็ตจริงขนาด 1920×1080 ย่อลงให้พอดีกล่อง */}
      <Stage key={play} src={`/dashboard/alert-preview?${q}`} onReplay={() => setPlay((n) => n + 1)} />

      <p className="mt-3 text-[13px] text-ink-2">
        ตอนนี้ใช้: <b className="text-ink">{using}</b>
      </p>

      <div role="tablist" aria-label="ที่มาของรูป" className="mt-3 inline-flex gap-1 rounded-full bg-fill p-1">
        {(
          [
            ["library", "คลังโดกู"],
            ["upload", "อัปโหลดเอง"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className={`min-h-9 rounded-full px-4 text-[14px] font-semibold transition-colors ${tab === id ? "bg-red text-white" : "text-ink-2 hover:text-ink"}`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "library" ? (
        <div className="mt-3">
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
            {STICKER_IDS.map((id) => (
              <button
                key={id}
                type="button"
                aria-pressed={sticker === id}
                onClick={() => save({ alertSticker: sticker === id ? null : id })}
                className={`rounded-2xl border-2 bg-paper p-1.5 pb-2 text-center transition-colors ${sticker === id ? "border-red" : "border-line hover:border-ink-3"}`}
              >
                <DoguSticker id={id} className="mx-auto w-full max-w-[84px]" />
                <span className="mt-0.5 block truncate text-[12px] font-semibold">{STICKERS[id].label}</span>
              </button>
            ))}
          </div>
          <label className="mt-3 flex items-center gap-3 rounded-2xl bg-paper px-4 py-3">
            <span className="min-w-0 flex-1">
              <b className="block text-[14px]">สุ่มท่าทุกครั้ง</b>
              <span className="text-[12px] text-ink-3">โดเนทแต่ละครั้งได้ท่าไม่ซ้ำกัน</span>
            </span>
            <input
              type="checkbox"
              role="switch"
              className="peer sr-only"
              checked={sticker === "random"}
              onChange={(e) => save({ alertSticker: e.target.checked ? "random" : "dance" })}
            />
            <span
              aria-hidden
              className="relative h-[31px] w-[51px] shrink-0 rounded-full bg-fill transition-colors duration-200 peer-checked:bg-red peer-focus-visible:outline-3 peer-focus-visible:outline-red/45 after:absolute after:left-[2px] after:top-[2px] after:size-[27px] after:rounded-full after:bg-white after:shadow-[0_3px_8px_rgb(0_0_0/0.15),0_1px_1px_rgb(0_0_0/0.16)] after:transition-transform after:duration-200 peer-checked:after:translate-x-5"
            />
          </label>
          {sticker && (
            <button type="button" className="btn-quiet mt-2 px-4 py-2" onClick={() => save({ alertSticker: null })}>
              ไม่ใช้สติกเกอร์{url ? " (กลับไปใช้รูปที่อัปโหลด)" : ""}
            </button>
          )}
        </div>
      ) : (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <input
            ref={input}
            type="file"
            accept="image/gif,image/png,image/jpeg,image/webp"
            className="sr-only"
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              if (f) upload(f);
            }}
          />
          <button type="button" className="btn-primary px-5 py-2.5 text-[15px]" disabled={busy} onClick={() => input.current?.click()}>
            {busy ? "กำลังบันทึก…" : url ? "เปลี่ยนรูป" : "อัปโหลดรูป / GIF"}
          </button>
          {url && sticker && (
            <button type="button" className="btn-quiet px-4 py-2.5" disabled={busy} onClick={() => save({ alertSticker: null })}>
              ใช้รูปนี้แทนสติกเกอร์
            </button>
          )}
          {url && (
            <button type="button" className="btn-quiet px-4 py-2.5" disabled={busy} onClick={remove}>
              เอารูปออก
            </button>
          )}
          <span className="text-[12px] text-ink-3">GIF, PNG, JPG, WEBP · ไม่เกิน 3 MB</span>
        </div>
      )}

      {(url || sticker) && (
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Seg label="ขนาดรูป" items={SIZES} value={size} onPick={(v) => save({ alertImageSize: v })} />
          <Seg label="ท่าเข้า" items={ANIMS} value={anim} onPick={(v) => save({ alertImageAnim: v })} />
        </div>
      )}

      {msg && (
        <p role="status" className={`mt-3 text-[13px] ${msg.ok ? "text-ok" : "text-red"}`}>
          {msg.text}
        </p>
      )}
    </div>
  );
}

function Stage({ src, onReplay }: { src: string; onReplay: () => void }) {
  const box = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setScale(el.clientWidth / 1920));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return (
    <div ref={box} className="relative aspect-video overflow-hidden rounded-2xl bg-[#0b0d12]">
      {scale > 0 && (
        <iframe
          title="ตัวอย่างแจ้งเตือนบนจอไลฟ์"
          src={src}
          tabIndex={-1}
          className="pointer-events-none absolute left-0 top-0 origin-top-left border-0"
          style={{ width: 1920, height: 1080, transform: `scale(${scale})` }}
        />
      )}
      <button type="button" onClick={onReplay} className="absolute right-2 top-2 rounded-full bg-black/55 px-3 py-1 text-[12px] font-semibold text-white">
        ▶ เล่นอีกครั้ง
      </button>
    </div>
  );
}

function Seg<T extends string>({ label, items, value, onPick }: { label: string; items: { id: T; label: string }[]; value: T; onPick: (v: T) => void }) {
  return (
    <div>
      <p className="mb-1.5 text-[13px] font-semibold text-ink-2">{label}</p>
      <div role="radiogroup" aria-label={label} className="flex gap-1 rounded-full bg-fill p-1">
        {items.map((it) => (
          <button
            key={it.id}
            type="button"
            role="radio"
            aria-checked={it.id === value}
            onClick={() => onPick(it.id)}
            className={`min-h-9 flex-1 rounded-full text-[13px] font-semibold transition-colors ${it.id === value ? "bg-red text-white" : "text-ink-2 hover:text-ink"}`}
          >
            {it.label}
          </button>
        ))}
      </div>
    </div>
  );
}
