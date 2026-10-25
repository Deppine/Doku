"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { baht } from "@/lib/format";

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
  const [limit, setLimit] = useState(8);

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
      <ul className="mt-2">
        {items.slice(0, limit).map((d) => (
          <li key={d.ref} className="flex items-start gap-3.5 border-t border-line py-3.5 first:border-t-0">
            <span aria-hidden className="grid size-10 shrink-0 place-items-center rounded-full bg-fill font-semibold">
              {d.donorName.slice(0, 1).toUpperCase()}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate">
                <b>{d.donorName}</b> <span className="text-[12px] text-ink-3">· {ago(d.createdAt)}</span>
              </p>
              {d.message && <p className="mt-0.5 break-words text-[14px] text-ink-2">{d.message}</p>}
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
      {items.length > limit && (
        <button type="button" onClick={() => setLimit((n) => n + 10)} className="mt-2 text-[14px] font-semibold text-red">
          ดูเพิ่ม ({items.length - limit} รายการ)
        </button>
      )}
    </>
  );
}

type Goal = { title: string; target: number; raised: number } | null;

/** เป้าหมายโดเนท: แสดงความคืบหน้า แก้ไข/ลบได้ */
export function GoalCard({ goal, widgetUrl }: { goal: Goal; widgetUrl: string }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(goal?.title ?? "");
  const [target, setTarget] = useState(goal ? String(goal.target) : "");
  const [reset, setReset] = useState(!goal);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

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
    <section aria-labelledby="goal-h" className="rounded-[22px] bg-surface p-5 sm:p-6">
      <div className="flex items-baseline justify-between gap-2">
        <h2 id="goal-h" className="text-[19px] font-semibold">
          เป้าหมายโดเนท
        </h2>
        {!editing && (
          <button type="button" onClick={() => setEditing(true)} className="text-[13px] font-semibold text-red">
            {goal ? "แก้ไข" : "ตั้งเป้าหมาย"}
          </button>
        )}
      </div>

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
        <>
          <p className="mt-3 font-semibold">{goal.title}</p>
          <p className="amount mt-0.5 text-[26px] tabular-nums">
            ฿{baht(goal.raised)} <span className="text-[14px] font-normal text-ink-3">/ ฿{baht(goal.target)}</span>
          </p>
          <div aria-hidden className="mt-2.5 h-2.5 rounded-full bg-fill">
            <div className="h-2.5 rounded-full bg-red" style={{ width: `${Math.max(2, pct)}%` }} />
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <CopyButton value={widgetUrl} label="คัดลอกลิงก์แถบเป้าหมาย (OBS)" className="rounded-full bg-fill px-3.5 py-2 text-[13px] font-semibold text-ink" />
          </div>
          <p className="mt-2 text-[12px] text-ink-3">ใน OBS เพิ่ม Browser Source ขนาด 600 × 160 พื้นหลังโปร่งใส</p>
        </>
      ) : (
        <p className="mt-3 text-[14px] text-ink-2">ตั้งเป้า เช่น &quot;ซื้อไมค์ใหม่ ฿5,000&quot; แล้วเอาแถบความคืบหน้าขึ้นจอไลฟ์ให้ผู้ชมช่วยกันเติม</p>
      )}
    </section>
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
export function AlertStylePicker({ initial }: { initial: "classic" | "card" }) {
  const [style, setStyle] = useState(initial);
  const [err, setErr] = useState<string | null>(null);
  async function pick(next: "classic" | "card") {
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
    }
  }
  const opts = [
    {
      v: "classic" as const,
      label: "ตัวอักษรกลางจอ",
      preview: (
        <span className="text-center text-[13px] leading-snug text-white">
          <b className="text-[#ff3b30]">มีมี่</b> โดเนทมา <b className="text-[#ff3b30]">50฿</b>
          <br />
          ขอเพลงหน่อย
        </span>
      ),
    },
    {
      v: "card" as const,
      label: "การ์ดขาว",
      preview: (
        <span className="rounded-lg bg-white px-3 py-2 text-[12px] text-[#1d1d1f]">
          <b>มีมี่</b> · ฿50
        </span>
      ),
    },
  ];
  return (
    <div>
      <p className="text-[14px] font-semibold">รูปแบบแจ้งเตือน</p>
      <div role="radiogroup" aria-label="รูปแบบแจ้งเตือน" className="mt-2 grid grid-cols-2 gap-2.5">
        {opts.map((o) => (
          <button
            key={o.v}
            type="button"
            role="radio"
            aria-checked={style === o.v}
            onClick={() => style !== o.v && pick(o.v)}
            className={`rounded-2xl border-2 bg-paper p-3 text-left ${style === o.v ? "border-red" : "border-line hover:border-ink-3"}`}
          >
            <span aria-hidden className="grid h-20 place-items-center rounded-xl bg-[#111]">
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
