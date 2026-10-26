"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function CopyField({ label, value, secret }: { label: string; value: string; secret?: boolean }) {
  const [copied, setCopied] = useState(false);
  const [shown, setShown] = useState(!secret);
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-surface px-4 py-3">
      <div className="min-w-0 flex-1">
        <p className="text-[12px] text-ink-3">{label}</p>
        <p className="truncate font-medium tabular-nums">{shown ? value : "•".repeat(32)}</p>
      </div>
      {secret && (
        <button type="button" onClick={() => setShown((v) => !v)} className="btn-quiet px-3 py-2 text-ink-2">
          {shown ? "ซ่อน" : "แสดง"}
        </button>
      )}
      <button
        type="button"
        onClick={async () => {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 1600);
        }}
        className="btn-quiet px-3 py-2"
      >
        {copied ? "คัดลอกแล้ว" : "คัดลอก"}
      </button>
    </div>
  );
}

export function TestAlertButton() {
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  return (
    <div className="mt-5 flex flex-wrap items-center gap-4">
      <button
        type="button"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          const res = await fetch("/api/widget/test", {
            method: "POST",
          });
          const json = await res.json();
          setBusy(false);
          setNote(
            json.online > 0
              ? "ส่งแจ้งเตือนทดสอบแล้ว (วิดเจ็ตเปิดอยู่)"
              : "ส่งแล้ว แต่ไม่มีวิดเจ็ตเปิดอยู่ เปิดลิงก์วิดเจ็ตใน OBS ก่อน"
          );
        }}
        className="btn-primary"
      >
        ทดสอบแจ้งเตือน
      </button>
      {note && <p className="text-[15px] text-ink-2" aria-live="polite">{note}</p>}
    </div>
  );
}

/** สร้างลิงก์ widget ใหม่ ใช้เมื่อลิงก์เก่าหลุด (ลิงก์เก่าหยุดทำงานทันที) */
export function RegenerateWidgetButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      disabled={busy}
      onClick={async () => {
        if (!window.confirm("สร้างลิงก์วิดเจ็ตใหม่? ลิงก์เดิมใน OBS จะใช้ไม่ได้ ต้องวางลิงก์ใหม่")) return;
        setBusy(true);
        await fetch("/api/dashboard/widget-token", { method: "POST" });
        setBusy(false);
        router.refresh();
      }}
      className="btn-quiet mt-5"
    >
      {busy ? "กำลังสร้าง…" : "สร้างลิงก์วิดเจ็ตใหม่"}
    </button>
  );
}
