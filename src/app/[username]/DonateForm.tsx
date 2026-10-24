"use client";

import { useEffect, useRef, useState } from "react";
import { baht } from "@/lib/format";
import type { SlipMode } from "@/lib/slip";

type Props = {
  username: string;
  minAmount: number;
  presets: number[];
  allowCustom: boolean;
  receiver: { name: string; id: string };
  slipMode: SlipMode;
};

type Payment = { id: string; amount: number; expiresAt: number; qr: string };
type Step = "form" | "pay" | "done" | "expired";

const NAME_KEY = "donate:name";

export function DonateForm({ username, minAmount, presets, allowCustom, receiver, slipMode }: Props) {
  const [step, setStep] = useState<Step>("form");
  const [amount, setAmount] = useState<number>(presets[Math.floor(presets.length / 2)] ?? minAmount);
  const [custom, setCustom] = useState("");
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [payment, setPayment] = useState<Payment | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      setName(localStorage.getItem(NAME_KEY) ?? "");
    } catch {}
  }, []);

  const value = custom ? Number(custom) : amount;
  const valid = Number.isFinite(value) && value >= minAmount;

  async function createPayment(e: React.FormEvent) {
    e.preventDefault();
    if (!valid) {
      setError(`โดเนทขั้นต่ำ ${minAmount} บาท`);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      try {
        localStorage.setItem(NAME_KEY, name);
      } catch {}
      const res = await fetch("/api/donate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, donorName: name, message, amount: value }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message ?? "สร้าง QR ไม่สำเร็จ");
      setPayment(json);
      setStep("pay");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "สร้าง QR ไม่สำเร็จ");
    } finally {
      setBusy(false);
    }
  }

  function reset() {
    setPayment(null);
    setStep("form");
    setMessage("");
    setError(null);
  }

  if (step === "pay" && payment) {
    return (
      <PayStep
        payment={payment}
        receiver={receiver}
        slipMode={slipMode}
        onDone={() => setStep("done")}
        onExpired={() => setStep("expired")}
        onCancel={reset}
      />
    );
  }

  if (step === "done" || step === "expired") {
    const done = step === "done";
    return (
      <section className="mt-10 rounded-[28px] bg-surface px-6 py-12 text-center" aria-live="polite">
        {done ? <CheckMark /> : null}
        <h2 className="display mt-6 text-[32px]">{done ? "ขึ้นจอแล้ว" : "QR หมดอายุแล้ว"}</h2>
        <p className="mx-auto mt-3 max-w-[32ch] text-ink-2">
          {done
            ? `ขอบคุณที่สนับสนุน ยอด ฿${baht(payment?.amount ?? 0)} ส่งถึงสตรีมเมอร์เรียบร้อย`
            : "สร้าง QR ใหม่เพื่อโดเนทอีกครั้ง ถ้าโอนไปแล้ว ไม่ต้องโอนซ้ำ ติดต่อสตรีมเมอร์ได้เลย"}
        </p>
        <button onClick={reset} className="btn-primary mt-8">
          {done ? "โดเนทอีกครั้ง" : "สร้าง QR ใหม่"}
        </button>
      </section>
    );
  }

  return (
    <form onSubmit={createPayment} className="mt-10" noValidate>
      {/* ยอดเงินตัวใหญ่ — จุดเด่นของหน้า */}
      <div className="text-center" aria-live="polite">
        <p className="amount text-[clamp(72px,22vw,128px)] text-red">฿{valid || !custom ? baht(value || 0) : custom}</p>
      </div>

      <fieldset className="mt-6">
        <legend className="sr-only">เลือกยอดเงิน</legend>
        <div
          className="grid gap-1 rounded-full bg-fill p-1"
          style={{ gridTemplateColumns: `repeat(${presets.length}, minmax(0, 1fr))` }}
        >
          {presets.map((p) => {
            const active = !custom && amount === p;
            return (
              <button
                key={p}
                type="button"
                aria-pressed={active}
                onClick={() => {
                  setAmount(p);
                  setCustom("");
                }}
                className={`rounded-full py-2 text-[15px] font-semibold tabular-nums transition-all duration-200 ${
                  active ? "bg-chip text-ink shadow-[0_3px_8px_rgb(0_0_0/0.12)]" : "text-ink-2 hover:text-ink"
                }`}
              >
                {baht(p)}
              </button>
            );
          })}
        </div>
      </fieldset>

      <div className="group-inset mt-8">
        {allowCustom && (
        <label className="flex items-center">
          <span className="w-28 shrink-0 pl-4 text-ink-2">ยอดอื่น</span>
          <input
            inputMode="decimal"
            placeholder={`ขั้นต่ำ ${minAmount} บาท`}
            value={custom}
            onChange={(e) => setCustom(e.target.value.replace(/[^\d.]/g, ""))}
            className="row-field pl-0 tabular-nums"
          />
        </label>
        )}
        <label className="flex items-center">
          <span className="w-28 shrink-0 pl-4 text-ink-2">ชื่อ</span>
          <input
            maxLength={40}
            placeholder="ไม่ระบุชื่อ"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="row-field pl-0"
            autoComplete="nickname"
          />
        </label>
        <label className="block">
          <span className="sr-only">ข้อความ</span>
          <textarea
            maxLength={255}
            rows={3}
            placeholder="ข้อความที่จะขึ้นจอ"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="row-field resize-none"
          />
          <span className="block px-4 pb-3 text-right text-[12px] text-ink-3 tabular-nums">{message.length}/255</span>
        </label>
      </div>

      {error && (
        <p role="alert" className="mt-4 text-center text-[15px] text-red">
          {error}
        </p>
      )}

      <button type="submit" disabled={busy} className="btn-primary mt-8 w-full py-4">
        {busy ? "กำลังสร้าง QR…" : `สร้าง QR พร้อมเพย์ ฿${valid ? baht(value) : "-"}`}
      </button>
      <p className="mt-4 text-center text-[13px] text-ink-3">
        โอนเข้าพร้อมเพย์ {receiver.name} โดยตรง
      </p>
    </form>
  );
}

function PayStep({
  payment,
  receiver,
  slipMode,
  onDone,
  onExpired,
  onCancel,
}: {
  payment: Payment;
  receiver: Props["receiver"];
  slipMode: SlipMode;
  onDone: () => void;
  onExpired: () => void;
  onCancel: () => void;
}) {
  const [now, setNow] = useState(Date.now());
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const cb = useRef({ onDone, onExpired });
  cb.current = { onDone, onExpired };

  const left = Math.max(0, payment.expiresAt - now);
  const mm = String(Math.floor(left / 60000)).padStart(2, "0");
  const ss = String(Math.floor((left % 60000) / 1000)).padStart(2, "0");

  // นับถอยหลัง + poll สถานะทุก 3 วินาที (เผื่อเปลี่ยนไปใช้ gateway ที่ยืนยันผ่าน webhook)
  useEffect(() => {
    const tick = setInterval(() => setNow(Date.now()), 1000);
    const poll = setInterval(async () => {
      const res = await fetch(`/api/donate/${payment.id}`).catch(() => null);
      const json = await res?.json().catch(() => null);
      if (json?.status === "SUCCESS") cb.current.onDone();
      if (json?.status === "EXPIRED") cb.current.onExpired();
    }, 3000);
    return () => {
      clearInterval(tick);
      clearInterval(poll);
    };
  }, [payment.id]);

  useEffect(() => {
    if (left === 0) cb.current.onExpired();
  }, [left]);

  const isTest = slipMode === "test";
  const [test, setTest] = useState({
    amount: String(payment.amount),
    receiver: receiver.id,
    transRef: randomRef(),
    paidBefore: false,
  });

  async function submitSlip() {
    if (!file && !isTest) {
      inputRef.current?.click();
      return;
    }
    setBusy(true);
    setError(null);
    const form = new FormData();
    if (file) form.append("slip", file);
    if (isTest) {
      form.append("testAmount", test.amount);
      form.append("testReceiver", test.receiver);
      form.append("testTransRef", test.transRef);
      if (test.paidBefore) form.append("testPaidBefore", "1");
    }
    try {
      const res = await fetch(`/api/donate/${payment.id}/slip`, { method: "POST", body: form });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message ?? "ตรวจสลิปไม่ผ่าน");
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "ตรวจสลิปไม่ผ่าน");
    } finally {
      setBusy(false);
    }
  }

  async function simulate() {
    setBusy(true);
    await fetch(`/api/donate/${payment.id}/simulate`, { method: "POST" });
    onDone();
  }

  return (
    <section className="mt-10">
      <div className="rounded-[28px] bg-surface px-6 pb-7 pt-8 text-center">
        <p className="amount text-[64px] text-red">฿{baht(payment.amount)}</p>
        <p className="mt-2 text-[15px] text-ink-2">
          {receiver.name} · พร้อมเพย์ {receiver.id}
        </p>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={payment.qr}
          alt={`QR พร้อมเพย์ ยอด ${payment.amount} บาท`}
          className="mx-auto mt-6 aspect-square w-full max-w-[280px] rounded-2xl"
        />
        <p className="mt-4 text-[15px] tabular-nums text-ink-2">
          QR ใช้ได้อีก <span className="font-semibold text-ink">{mm}:{ss}</span>
        </p>
        <a href={payment.qr} download={`promptpay-${payment.amount}.png`} className="btn-quiet mt-2">
          บันทึกรูป QR
        </a>
      </div>

      <div className="mt-6 rounded-[28px] bg-surface p-6">
        <h2 className="text-[19px] font-semibold tracking-tight">โอนแล้ว แนบสลิปที่นี่</h2>
        <p className="mt-1 text-[15px] text-ink-2">ระบบจะตรวจยอดและบัญชีผู้รับ แล้วขึ้นจอให้อัตโนมัติ</p>
        <label className="mt-5 flex cursor-pointer items-center justify-between gap-3 rounded-2xl bg-paper px-4 py-4 transition-colors hover:bg-fill-hover">
          <span className={`truncate text-[15px] ${file ? "text-ink" : "text-ink-3"}`}>
            {file ? file.name : "เลือกรูปสลิป"}
          </span>
          <span className="shrink-0 text-[15px] font-medium text-red">{file ? "เปลี่ยนรูป" : "เลือกไฟล์"}</span>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
        </label>
        {isTest && (
          <fieldset className="mt-5 rounded-2xl border border-dashed border-red/40 p-4">
            <legend className="px-1 text-[13px] font-medium text-red">โหมดทดสอบ: ข้อมูลที่สมมติว่าอ่านได้จากสลิป</legend>
            <div className="grid gap-3 sm:grid-cols-2">
              <TestField label="ยอดในสลิป (บาท)" value={test.amount} onChange={(v) => setTest({ ...test, amount: v })} inputMode="decimal" />
              <TestField label="บัญชีผู้รับในสลิป" value={test.receiver} onChange={(v) => setTest({ ...test, receiver: v })} />
              <div className="sm:col-span-2">
                <TestField label="เลขอ้างอิงสลิป (transRef)" value={test.transRef} onChange={(v) => setTest({ ...test, transRef: v })} />
                <button type="button" onClick={() => setTest({ ...test, transRef: randomRef() })} className="mt-1 text-[13px] text-red">
                  สุ่มเลขใหม่
                </button>
              </div>
            </div>
            <label className="mt-3 flex items-center gap-2 text-[15px] text-ink-2">
              <input
                type="checkbox"
                checked={test.paidBefore}
                onChange={(e) => setTest({ ...test, paidBefore: e.target.checked })}
                className="size-4 accent-[var(--color-red)]"
              />
              สลิปนี้โอนก่อนสร้าง QR (สลิปเก่า)
            </label>
            <p className="mt-3 text-[13px] text-ink-3">
              ลองแก้ทีละช่องให้ผิด แล้วกดส่ง ระบบควรปฏิเสธ · ใช้เลขอ้างอิงเดิมซ้ำกับรายการถัดไปเพื่อทดสอบสลิปซ้ำ
            </p>
          </fieldset>
        )}
        {error && (
          <p role="alert" className="mt-3 text-[15px] text-red">
            {error}
          </p>
        )}
        <button onClick={submitSlip} disabled={busy} className="btn-primary mt-5 w-full py-4">
          {busy ? "กำลังตรวจสลิป…" : isTest ? "ส่งสลิปทดสอบ" : "ส่งสลิป"}
        </button>
        {slipMode === "mock" && (
          <button onClick={simulate} disabled={busy} className="btn-quiet mt-2 w-full">
            จำลองการโอน (โหมดทดสอบ)
          </button>
        )}
      </div>

      <button onClick={onCancel} className="mx-auto mt-6 block text-[15px] text-ink-2 hover:text-ink">
        ยกเลิกและแก้ไขยอด
      </button>
    </section>
  );
}

function CheckMark() {
  return (
    <svg viewBox="0 0 52 52" className="mx-auto size-20" aria-hidden>
      <circle cx="26" cy="26" r="25" fill="var(--color-red)" />
      <path
        d="M15 27l7 7 15-16"
        fill="none"
        stroke="#fff"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray="40"
        strokeDashoffset="40"
        style={{ animation: "check-draw 500ms 150ms var(--ease-apple) forwards" }}
      />
    </svg>
  );
}

function randomRef() {
  return "TEST" + Math.random().toString(36).slice(2, 10).toUpperCase();
}

function TestField({
  label,
  value,
  onChange,
  inputMode,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  inputMode?: "decimal";
}) {
  return (
    <label className="block">
      <span className="text-[12px] text-ink-3">{label}</span>
      <input
        value={value}
        inputMode={inputMode}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 block w-full rounded-xl bg-paper px-3 py-2 text-[15px] tabular-nums focus:outline-none focus-visible:ring-2 focus-visible:ring-red/40"
      />
    </label>
  );
}
