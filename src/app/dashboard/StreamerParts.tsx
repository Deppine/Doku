"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { baht } from "@/lib/format";
import type { AlertStyle } from "@/lib/alert-style";
import { Mascot } from "@/components/Mascot";
import type { GoalStyle } from "@/lib/streamer-stats";
import { SettingBlock } from "./DashboardShell";
import { CopyField } from "./DashboardClient";

/** ปุ่มคัดลอกข้อความ */
export function CopyButton({ value, label, className }: { value: string; label: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        await navigator.clipboard.writeText(value).catch(() => {});
        setCopied(true);
        setTimeout(() => setCopied(false), 1600);
      }}
      className={className ?? "min-h-11 rounded-full border border-line px-4 text-[14px] font-semibold text-ink hover:bg-fill"}
    >
      {copied ? "คัดลอกแล้ว" : label}
    </button>
  );
}

/** ทดสอบแจ้งเตือน (ด้านบนของหน้า) แล้วรีเฟรชเช็กลิสต์ */
export function TestButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  return (
    <div className="flex flex-col items-start gap-1">
      <button
        type="button"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          const res = await fetch("/api/widget/test", { method: "POST" });
          const json = await res.json().catch(() => ({}));
          setBusy(false);
          setNote(json.online > 0 ? "ส่งแล้ว ดูที่จอ OBS ได้เลย" : "ส่งแล้ว แต่ยังไม่มีวิดเจ็ตเปิดอยู่ใน OBS");
          setTimeout(() => setNote(null), 5000);
          router.refresh();
        }}
        className="btn-primary min-h-11 px-5 py-2 text-[14px]"
      >
        {busy ? "กำลังส่ง…" : "ทดสอบแจ้งเตือน"}
      </button>
      <p aria-live="polite" className="min-h-4 text-[12px] text-ink-2">
        {note}
      </p>
    </div>
  );
}

type Step = { label: string; done: boolean; href: string };

/** เช็กลิสต์เริ่มต้นใช้งาน (ซ่อนได้ จำไว้ในเบราว์เซอร์นี้) */
export function SetupChecklist({ steps, userId }: { steps: Step[]; userId: number }) {
  const key = `doku:setup-hidden:${userId}`;
  const [hidden, setHidden] = useState(true);
  useEffect(() => {
    try {
      setHidden(localStorage.getItem(key) === "1");
    } catch {
      setHidden(false);
    }
  }, [key]);
  const done = steps.filter((s) => s.done).length;
  if (hidden || done === steps.length) return null;
  return (
    <section aria-labelledby="setup-h" className="mt-6 rounded-[22px] bg-surface px-5 py-5 sm:px-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="setup-h" className="text-[17px] font-semibold">
          เริ่มต้นใช้งาน · เสร็จ {done} จาก {steps.length}
        </h2>
        <button
          type="button"
          onClick={() => {
            setHidden(true);
            try {
              localStorage.setItem(key, "1");
            } catch {}
          }}
          className="rounded-full px-2.5 py-1 text-[13px] text-ink-3 hover:bg-fill"
        >
          ซ่อน
        </button>
      </div>
      <div aria-hidden className="mt-2.5 h-1.5 rounded-full bg-fill">
        <div className="h-1.5 rounded-full bg-red" style={{ width: `${(done / steps.length) * 100}%` }} />
      </div>
      <ol className="mt-3.5 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
        {steps.map((s) => (
          <li key={s.label} className="flex min-h-12 items-center gap-2.5 rounded-2xl bg-fill/50 px-3.5">
            <span
              aria-hidden
              className={`grid size-6 shrink-0 place-items-center rounded-full text-[13px] font-bold ${s.done ? "bg-ok text-page" : "border border-line text-ink-3"}`}
            >
              {s.done ? "✓" : ""}
            </span>
            <span className={`flex-1 text-[14px] ${s.done ? "text-ink-3" : "text-ink"}`}>
              {s.label}
              <span className="sr-only">{s.done ? " (เสร็จแล้ว)" : " (ยังไม่ได้ทำ)"}</span>
            </span>
            {!s.done && (
              <a href={s.href} className="text-[13px] font-semibold">
                ทำเลย
              </a>
            )}
          </li>
        ))}
      </ol>
    </section>
  );
}

type FeedItem = { id?: string; ref: string; donorName: string; message: string; amount: number; createdAt: number };

function ago(ms: number) {
  const m = Math.round((Date.now() - ms) / 60000);
  if (m < 1) return "เมื่อสักครู่";
  if (m < 60) return `${m} นาทีก่อน`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} ชม. ก่อน`;
  return new Date(ms).toLocaleString("th-TH", { timeZone: "Asia/Bangkok", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

/** รายการโดเนทล่าสุด + ปุ่มเล่นซ้ำบนจอ (รีเฟรชข้อมูลเองทุก 30 วินาที) */
export function DonationList({ items }: { items: FeedItem[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [note, setNote] = useState<{ ref: string; text: string } | null>(null);

  useEffect(() => {
    const t = setInterval(() => router.refresh(), 30_000);
    return () => clearInterval(t);
  }, [router]);

  async function replay(d: FeedItem) {
    if (!d.id) return;
    setBusy(d.ref);
    const res = await fetch("/api/dashboard/replay", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ref: d.id }),
    });
    const json = await res.json().catch(() => ({}));
    setBusy(null);
    setNote({ ref: d.ref, text: res.ok ? "ส่งขึ้นจอแล้ว" : (json.message ?? "เล่นซ้ำไม่สำเร็จ") });
    setTimeout(() => setNote(null), 3000);
  }

  if (items.length === 0) {
    return <p className="mt-4 rounded-2xl bg-fill/50 p-5 text-[15px] text-ink-2">ยังไม่มีโดเนท แชร์ลิงก์หรือ QR ให้ผู้ชม แล้วกดทดสอบแจ้งเตือนเพื่อเช็กหน้าจอ</p>;
  }
  return (
    <>
      {/* กล่องสูงคงที่ (~6 รายการ) เลื่อนดูรายการที่เหลือในกล่อง ไม่ดันหน้ายาวลงไป */}
      <ul tabIndex={0} aria-label="รายการโดเนทล่าสุด" className="mt-2 max-h-[440px] overflow-y-auto overscroll-contain pr-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-red/40 rounded-xl">
        {items.map((d) => (
          <li key={d.ref} className="flex items-start gap-3.5 border-t border-line py-3.5 first:border-t-0">
            <span aria-hidden className="grid size-10 shrink-0 place-items-center rounded-full bg-fill font-semibold">
              {d.donorName.slice(0, 1).toUpperCase()}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate">
                <b>{d.donorName}</b> <span className="text-[12px] text-ink-3">· {ago(d.createdAt)}</span>
              </p>
              {d.message && <p className="mt-0.5 line-clamp-2 break-words text-[14px] text-ink-2" title={d.message}>{d.message}</p>}
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1.5">
              <span className="amount text-[18px] text-red tabular-nums">฿{baht(d.amount)}</span>
              {d.id && (
                <button
                  type="button"
                  disabled={busy === d.ref}
                  onClick={() => replay(d)}
                  className="rounded-full bg-fill px-2.5 py-1 text-[12px] font-semibold text-ink-2 hover:text-ink"
                >
                  {note?.ref === d.ref ? note.text : busy === d.ref ? "กำลังส่ง…" : "เล่นซ้ำบนจอ"}
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>
      {items.length > 6 && <p className="mt-2 text-[12px] text-ink-3">แสดง {items.length} รายการล่าสุด · เลื่อนในกล่องเพื่อดูเพิ่ม</p>}
    </>
  );
}

type Goal = { title: string; target: number; raised: number; style: GoalStyle } | null;

/** เป้าหมายโดเนท: แสดงความคืบหน้า แก้ไข/ลบได้ */
export function GoalCard({ goal, widgetUrl }: { goal: Goal; widgetUrl: string }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(goal?.title ?? "");
  const [target, setTarget] = useState(goal ? String(goal.target) : "");
  const [reset, setReset] = useState(!goal);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [style, setStyle] = useState<GoalStyle>(goal?.style ?? "basic");

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    const res = await fetch("/api/dashboard/goal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, target: Number(target), reset }),
    });
    const json = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setErr(json.message ?? "บันทึกไม่สำเร็จ");
    setEditing(false);
    router.refresh();
  }

  async function remove() {
    if (!window.confirm("ลบเป้าหมายนี้?")) return;
    await fetch("/api/dashboard/goal", { method: "DELETE" });
    setEditing(false);
    setTitle("");
    setTarget("");
    router.refresh();
  }

  const pct = goal ? Math.min(100, (goal.raised / goal.target) * 100) : 0;
  return (
    <div className="space-y-4">
      <SettingBlock
        icon="goal"
        title="เป้าหมาย"
        desc="ตั้งชื่อและยอดที่อยากได้ เช่น ซื้อไมค์ใหม่ ฿5,000 ยอดจะเพิ่มเองทุกครั้งที่มีโดเนทผ่านการตรวจ"
      >
        {editing ? (
          <form onSubmit={save} className="mt-3 space-y-2.5">
            <label className="block">
              <span className="text-[13px] text-ink-2">ชื่อเป้าหมาย</span>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={80}
                placeholder="เช่น ซื้อไมค์ใหม่"
                className="mt-1 block min-h-11 w-full rounded-xl bg-paper px-3 text-[15px] focus:outline-none focus-visible:ring-2 focus-visible:ring-red/40"
              />
            </label>
            <label className="block">
              <span className="text-[13px] text-ink-2">ยอดเป้าหมาย (บาท)</span>
              <input
                value={target}
                onChange={(e) => setTarget(e.target.value.replace(/\D/g, "").slice(0, 8))}
                inputMode="numeric"
                placeholder="5000"
                className="mt-1 block min-h-11 w-full rounded-xl bg-paper px-3 text-[15px] tabular-nums focus:outline-none focus-visible:ring-2 focus-visible:ring-red/40"
              />
            </label>
            {goal && (
              <label className="flex items-center gap-2 text-[14px] text-ink-2">
                <input type="checkbox" checked={reset} onChange={(e) => setReset(e.target.checked)} className="size-4 accent-[var(--color-red)]" />
                เริ่มนับยอดใหม่ตั้งแต่ตอนนี้
              </label>
            )}
            {err && (
              <p role="alert" className="text-[13px] text-red">
                {err}
              </p>
            )}
            <div className="flex flex-wrap gap-2 pt-1">
              <button type="submit" disabled={busy} className="btn-primary min-h-11 px-4 py-2 text-[14px]">
                {busy ? "กำลังบันทึก…" : "บันทึก"}
              </button>
              <button type="button" onClick={() => setEditing(false)} className="btn-quiet min-h-11 px-4 py-2 text-[14px] text-ink-2">
                ยกเลิก
              </button>
              {goal && (
                <button type="button" onClick={remove} className="ml-auto min-h-11 px-2 text-[14px] text-ink-3 hover:text-red">
                  ลบเป้าหมาย
                </button>
              )}
            </div>
          </form>
        ) : goal ? (
          <div className="rounded-2xl bg-paper p-4">
            <div className="flex items-start justify-between gap-3">
              <p className="min-w-0 font-semibold">{goal.title}</p>
              <button type="button" onClick={() => setEditing(true)} className="shrink-0 text-[13px] font-semibold text-red">
                แก้ไข
              </button>
            </div>
            <p className="amount mt-1 text-[28px] tabular-nums">
              ฿{baht(goal.raised)} <span className="text-[14px] font-normal text-ink-3">/ ฿{baht(goal.target)}</span>
            </p>
            <div aria-hidden className="mt-2.5 h-2.5 rounded-full bg-fill">
              <div className="h-2.5 rounded-full bg-red" style={{ width: `${Math.max(2, pct)}%` }} />
            </div>
            <p className="mt-1.5 text-[12px] text-ink-3">{Math.floor(pct)}% ของเป้าหมาย</p>
          </div>
        ) : (
          <div className="rounded-2xl bg-paper p-4">
            <p className="text-[14px] text-ink-2">ยังไม่มีเป้าหมาย ตั้งแล้วเอาหลอดขึ้นจอไลฟ์ให้ผู้ชมช่วยกันเติม</p>
            <button type="button" onClick={() => setEditing(true)} className="btn-primary mt-3 px-5 py-2.5 text-[15px]">
              ตั้งเป้าหมาย
            </button>
          </div>
        )}
      </SettingBlock>

      {goal && (
        <>
          <SettingBlock icon="page" title="หน้าตาบนจอไลฟ์" desc="เลือกแล้วบันทึกทันที หลอดใน OBS เปลี่ยนตามภายใน 10 วินาที ไม่ต้องรีเฟรช">
            <GoalStylePicker initial={style} onChange={setStyle} />
            <GoalPreview widgetUrl={widgetUrl} style={style} />
          </SettingBlock>
          <SettingBlock
            icon="bell"
            title="ลิงก์วิดเจ็ตเป้าหมาย"
            desc={`ใน OBS เพิ่ม Browser Source แล้ววางลิงก์นี้ ขนาดที่แนะนำ ${GOAL_SIZES[style].label} พื้นหลังโปร่งใส`}
          >
            <div className="[&>div]:bg-paper">
              <CopyField label="ลิงก์หลอดเป้าหมาย (เก็บเป็นความลับ)" value={widgetUrl} secret />
            </div>
          </SettingBlock>
        </>
      )}
    </div>
  );
}

/** ขนาด Browser Source ที่แนะนำ + ตำแหน่งบนจอ 1920×1080 สำหรับตัวอย่าง */
const GOAL_SIZES: Record<GoalStyle, { w: number; h: number; label: string; pos: React.CSSProperties }> = {
  basic: { w: 600, h: 160, label: "600 × 160", pos: { left: 60, top: 60 } },
  tube: { w: 360, h: 640, label: "360 × 640", pos: { right: 60, top: 220 } },
  ring: { w: 300, h: 90, label: "300 × 90", pos: { right: 60, top: 60 } },
  battery: { w: 560, h: 150, label: "560 × 150", pos: { left: 60, top: 60 } },
  gauge: { w: 380, h: 250, label: "380 × 250", pos: { right: 60, top: 60 } },
  milestone: { w: 660, h: 180, label: "660 × 180", pos: { left: 630, bottom: 40 } },
};

/** ตัวอย่างหลอดจริงบนจอไลฟ์ย่อส่วน (วิดเจ็ตเดียวกับใน OBS ขนาดตามที่แนะนำ) */
function GoalPreview({ widgetUrl, style }: { widgetUrl: string; style: GoalStyle }) {
  const box = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setScale(el.clientWidth / 1920));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const z = GOAL_SIZES[style];
  return (
    <div className="mt-4">
      <p className="mb-1.5 text-[13px] text-ink-2">ตัวอย่างบนจอไลฟ์ (ยอดจริงตอนนี้)</p>
      <div
        ref={box}
        className="relative aspect-video overflow-hidden rounded-2xl bg-[radial-gradient(70%_60%_at_15%_100%,#3a1d2a_0%,transparent_60%),radial-gradient(60%_60%_at_95%_0%,#1d2a44_0%,transparent_60%),linear-gradient(180deg,#141821,#0b0d12)]"
      >
        {scale > 0 && (
          <div className="absolute left-0 top-0 origin-top-left" style={{ width: 1920, height: 1080, transform: `scale(${scale})` }}>
            <iframe
              key={style}
              title="ตัวอย่างหลอดเป้าหมายบนจอไลฟ์"
              src={`${widgetUrl}&style=${style}`}
              tabIndex={-1}
              className="pointer-events-none absolute border-0"
              style={{ width: z.w, height: z.h, ...z.pos, background: "transparent" }}
            />
          </div>
        )}
      </div>
    </div>
  );
}

/** เลือกหน้าตาหลอดเป้าหมาย (บันทึกทันที OBS เปลี่ยนตามในไม่เกิน 10 วินาที) */
function GoalStylePicker({ initial, onChange }: { initial: GoalStyle; onChange?: (s: GoalStyle) => void }) {
  const [style, setStyle] = useState<GoalStyle>(initial);
  const [err, setErr] = useState<string | null>(null);
  async function pick(next: GoalStyle) {
    const prev = style;
    setStyle(next);
    setErr(null);
    const res = await fetch("/api/dashboard/goal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ style: next }),
    });
    if (!res.ok) {
      setStyle(prev);
      setErr((await res.json().catch(() => ({}))).message ?? "บันทึกไม่สำเร็จ");
      return;
    }
    onChange?.(next);
  }
  const opts: { v: GoalStyle; label: string; preview: ReactNode }[] = [
    {
      v: "basic",
      label: "แบบเรียบ",
      preview: (
        <span className="w-[82%] rounded-lg bg-[#1c1c1e] p-1.5">
          <span className="block h-2 rounded-full bg-white/15">
            <span className="block h-2 w-[65%] rounded-full bg-[#ff3b30]" />
          </span>
        </span>
      ),
    },
    {
      v: "tube",
      label: "หลอดแก้วเก็บเงิน",
      preview: (
        <span className="relative h-[70%] w-5 overflow-hidden rounded-full bg-white/10 shadow-[inset_0_0_0_1.5px_rgba(255,255,255,.3)]">
          <span className="absolute inset-x-0 bottom-0 h-[65%] bg-[linear-gradient(180deg,#ff5a4f,#c40000)]" />
        </span>
      ),
    },
    {
      v: "ring",
      label: "วงแหวนมุมจอ",
      preview: (
        <span className="flex items-center gap-1 rounded-full bg-[rgba(10,10,12,.9)] py-0.5 pl-0.5 pr-2 shadow-[0_0_0_1px_rgba(255,255,255,.1)]">
          <span className="grid size-6 place-items-center rounded-full bg-[conic-gradient(#ff3b30_234deg,rgba(255,255,255,.15)_0deg)]">
            <span className="size-[18px] rounded-full bg-[#121214]" />
          </span>
          <span className="h-1.5 w-7 rounded-full bg-white/40" />
        </span>
      ),
    },
    {
      v: "battery",
      label: "แบตเตอรี่ชาร์จ",
      preview: (
        <span className="flex items-center">
          <span className="flex h-5 w-16 gap-[2px] rounded-[4px] p-[2px] shadow-[inset_0_0_0_1.5px_rgba(255,255,255,.4)]">
            {[1, 1, 1, 1, 1, 1, 0, 0, 0].map((on, i) => (
              <span key={i} className="flex-1 rounded-[1px]" style={{ background: on ? "#30d158" : "rgba(255,255,255,.1)" }} />
            ))}
          </span>
          <span className="ml-[2px] h-2 w-1 rounded-r-sm bg-white/40" />
        </span>
      ),
    },
    {
      v: "gauge",
      label: "มาตรวัดเข็ม",
      preview: (
        <svg viewBox="0 0 60 34" className="w-14" aria-hidden>
          <path d="M6 30 A24 24 0 0 1 54 30" fill="none" stroke="rgba(255,255,255,.15)" strokeWidth="5" strokeLinecap="round" />
          <path d="M6 30 A24 24 0 0 1 44 12" fill="none" stroke="#ff3b30" strokeWidth="5" strokeLinecap="round" />
          <path d="M29 30 L42 14 L31 31 Z" fill="#fff" />
        </svg>
      ),
    },
    {
      v: "milestone",
      label: "ด่านเป้าหมาย",
      preview: (
        <span className="relative flex w-[80%] items-center justify-between">
          <span className="absolute inset-x-1 top-1/2 h-[3px] -translate-y-1/2 bg-white/15">
            <span className="block h-full w-[55%] bg-[#ff3b30]" />
          </span>
          {[2, 2, 1, 0].map((st, i) => (
            <span
              key={i}
              className={`relative size-3 rounded-full border-2 ${st === 2 ? "border-[#ff3b30] bg-[#ff3b30]" : st === 1 ? "border-[#ff3b30] bg-[#1c1c1e]" : "border-white/25 bg-[#1c1c1e]"}`}
            />
          ))}
        </span>
      ),
    },
  ];
  return (
    <div>
      <div role="radiogroup" aria-label="หน้าตาหลอดเป้าหมาย" className="grid grid-cols-3 gap-2 sm:grid-cols-6">
        {opts.map((o) => (
          <button
            key={o.v}
            type="button"
            role="radio"
            aria-checked={style === o.v}
            onClick={() => style !== o.v && pick(o.v)}
            className={`rounded-xl border-2 bg-paper p-1.5 text-left ${style === o.v ? "border-red" : "border-line hover:border-ink-3"}`}
          >
            <span aria-hidden className="relative grid h-14 place-items-center overflow-hidden rounded-lg bg-[linear-gradient(180deg,#141821,#0b0d12)]">
              {o.preview}
            </span>
            <span className="mt-1 block px-0.5 text-[12px] font-semibold leading-tight">{o.label}</span>
          </button>
        ))}
      </div>
      {err && (
        <p role="alert" className="mt-1.5 text-[13px] text-red">
          {err}
        </p>
      )}
    </div>
  );
}

/** แท็บตั้งค่า (จำแท็บล่าสุดไว้ในเบราว์เซอร์นี้ · ลิงก์ #obs #sound #page เปิดแท็บนั้นได้) */
export function SettingsTabs({ tabs }: { tabs: { id: string; label: string; content: ReactNode }[] }) {
  const [active, setActive] = useState(tabs[0].id);
  const ids = tabs.map((t) => t.id).join(",");
  useEffect(() => {
    const list = ids.split(",");
    const fromHash = () => {
      const h = location.hash.slice(1);
      if (list.includes(h)) setActive(h);
    };
    try {
      const saved = localStorage.getItem("doku:dash-tab");
      if (saved && list.includes(saved)) setActive(saved);
    } catch {}
    fromHash();
    window.addEventListener("hashchange", fromHash);
    return () => window.removeEventListener("hashchange", fromHash);
  }, [ids]);
  const choose = (id: string) => {
    setActive(id);
    try {
      localStorage.setItem("doku:dash-tab", id);
    } catch {}
  };
  return (
    <section id="settings" aria-label="ตั้งค่า" className="mt-10 scroll-mt-20">
      {tabs.map((t) => (
        <span key={t.id} id={t.id} className="relative -top-20 block" aria-hidden />
      ))}
      <div role="tablist" aria-label="ตั้งค่า" className="inline-flex flex-wrap gap-1 rounded-full bg-fill p-1 text-[14px]">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            id={`tab-${t.id}`}
            aria-selected={active === t.id}
            aria-controls={`panel-${t.id}`}
            onClick={() => choose(t.id)}
            className={`min-h-10 rounded-full px-4 font-semibold transition-all ${
              active === t.id ? "bg-chip text-ink shadow-[0_2px_6px_rgb(0_0_0/0.12)]" : "text-ink-2 hover:text-ink"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      {tabs.map((t) => (
        <div key={t.id} role="tabpanel" id={`panel-${t.id}`} aria-labelledby={`tab-${t.id}`} hidden={active !== t.id} className="mt-4">
          {t.content}
        </div>
      ))}
    </section>
  );
}

/** เลือกรูปแบบแจ้งเตือนบนจอ (บันทึกทันที วิดเจ็ตเปลี่ยนตามโดยไม่ต้องรีเฟรช) */
export function AlertStylePicker({ initial }: { initial: AlertStyle }) {
  const [style, setStyle] = useState<AlertStyle>(initial);
  const [err, setErr] = useState<string | null>(null);
  async function pick(next: AlertStyle) {
    const prev = style;
    setStyle(next);
    setErr(null);
    const res = await fetch("/api/dashboard/alert-settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ alertStyle: next }),
    });
    if (!res.ok) {
      setStyle(prev);
      setErr((await res.json().catch(() => ({}))).message ?? "บันทึกไม่สำเร็จ");
      return;
    }
    // ให้ตัวอย่างรูป/GIF ด้านล่างเปลี่ยนตามรูปแบบที่เลือก
    window.dispatchEvent(new CustomEvent("doku:alert-style", { detail: next }));
  }
  const opts: { v: AlertStyle; label: string; preview: ReactNode }[] = [
    {
      v: "classic",
      label: "ตัวอักษรกลางจอ",
      preview: (
        <span className="grid h-full place-items-center text-center text-[13px] font-bold leading-snug text-white">
          <span>
            <span className="text-[#ff3b30]">มีมี่</span> โดเนทมา <span className="text-[#ff3b30]">50฿</span>
            <br />
            <span className="text-[11px]">ขอเพลงหน่อย</span>
          </span>
        </span>
      ),
    },
    {
      v: "neon",
      label: "นีออนมุมจอ",
      preview: (
        <span className="absolute bottom-2.5 left-2.5 flex items-center gap-1.5 rounded-[10px] bg-[rgba(30,12,14,.95)] py-1.5 pl-1.5 pr-2.5 text-[11px] text-white shadow-[0_0_0_1px_rgba(255,59,48,.6),0_0_14px_rgba(255,59,48,.5)]">
          <span className="grid size-5 place-items-center rounded-full bg-[linear-gradient(140deg,#ff6b5e,#c40000)] font-bold">ม</span>
          <b>มีมี่</b>
          <b className="text-[#ff5a4f]">฿50</b>
        </span>
      ),
    },
    {
      v: "pop",
      label: "ป้ายเด้งกลางจอ",
      preview: (
        <span className="grid h-full place-items-center">
          <span className="rounded-xl bg-[linear-gradient(160deg,#ff5a4f,#e10600_55%,#8f0010)] px-3.5 py-1.5 text-center font-bold leading-tight text-white">
            <span className="block text-[20px]">฿50</span>
            <span className="block text-[10px]">มีมี่ โดเนท</span>
          </span>
        </span>
      ),
    },
    {
      v: "led",
      label: "ป้ายไฟ LED",
      preview: (
        <span
          className="absolute inset-x-0 top-0 flex items-center gap-2 border-b-2 border-[#e10600] bg-[#070708] px-2.5 py-1.5 text-[11px] font-bold text-white"
          style={{ backgroundImage: "radial-gradient(rgba(255,59,48,.22) 1px,transparent 1.4px)", backgroundSize: "5px 5px" }}
        >
          <span className="rounded-[3px] bg-[#e10600] px-1 text-[9px]">DONATE</span>
          <span className="text-[#ff5a4f] [text-shadow:0_0_5px_rgba(255,59,48,.9)]">มีมี่ ฿50</span>
        </span>
      ),
    },
    {
      v: "sign",
      label: "โดกูชูป้าย",
      preview: (
        <span className="absolute bottom-0 left-2 flex items-end">
          <Mascot className="block w-9" eyes="happy" wave />
          <span className="mb-6 -ml-1 rounded-md bg-white px-1.5 py-0.5 text-[10px] font-bold text-[#1d1d1f]">
            มีมี่ <span className="text-[#e10600]">฿50</span>
          </span>
        </span>
      ),
    },
    {
      v: "announce",
      label: "โดกูประกาศ",
      preview: (
        <span className="absolute inset-x-0 bottom-0 flex items-end gap-1 bg-[linear-gradient(180deg,transparent,rgba(0,0,0,.7))] px-2 pb-1.5 pt-3">
          <Mascot className="-mb-1.5 block w-7" mouth="talk" />
          <span className="text-[10px] font-bold leading-tight text-white">
            <span className="rounded-sm bg-[#e10600] px-1 text-[8px]">📢 ประกาศ</span>
            <br />
            มีมี่ <span className="text-[#ff5a4f]">฿50</span>
          </span>
        </span>
      ),
    },
  ];
  // แบบที่เลิกให้เลือกแล้ว (นีออน ป้ายเด้ง ป้ายไฟ LED การ์ดขาว): วิดเจ็ตยังแสดงได้
  // โชว์ในตัวเลือกเฉพาะคนที่ยังใช้อยู่ จะได้รู้ว่าตอนนี้ใช้แบบไหน และเปลี่ยนไปแบบใหม่ได้
  const retired: AlertStyle[] = ["neon", "pop", "led"];
  const shown = opts
    .filter((o) => !retired.includes(o.v) || o.v === initial)
    .map((o) => (retired.includes(o.v) ? { ...o, label: `${o.label} (แบบเก่า)` } : o));
  if (initial === "card") {
    shown.push({
      v: "card",
      label: "การ์ดขาว (แบบเก่า)",
      preview: (
        <span className="grid h-full place-items-center">
          <span className="rounded-lg bg-white px-3 py-2 text-[12px] text-[#1d1d1f]">
            <b>มีมี่</b> · ฿50
          </span>
        </span>
      ),
    });
  }
  return (
    <div>
      <p className="text-[14px] font-semibold">รูปแบบแจ้งเตือน</p>
      <div role="radiogroup" aria-label="รูปแบบแจ้งเตือน" className="mt-2 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
        {shown.map((o) => (
          <button
            key={o.v}
            type="button"
            role="radio"
            aria-checked={style === o.v}
            onClick={() => style !== o.v && pick(o.v)}
            className={`rounded-2xl border-2 bg-paper p-3 text-left ${style === o.v ? "border-red" : "border-line hover:border-ink-3"}`}
          >
            <span aria-hidden className="relative block h-20 overflow-hidden rounded-xl bg-[linear-gradient(180deg,#141821,#0b0d12)]">
              {o.preview}
            </span>
            <span className="mt-2 block text-[14px] font-semibold">{o.label}</span>
          </button>
        ))}
      </div>
      {err && (
        <p role="alert" className="mt-1.5 text-[13px] text-red">
          {err}
        </p>
      )}
    </div>
  );
}
