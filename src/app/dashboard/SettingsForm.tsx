"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Values = {
  displayName: string;
  bio: string;
  promptpayId: string;
  promptpayName: string;
  minAmount: number;
  presets: number[];
  allowCustomAmount: boolean;
};

export function SettingsForm({ initial }: { initial: Values }) {
  const router = useRouter();
  const [v, setV] = useState({ ...initial, presets: initial.presets.join(", ") });
  const [state, setState] = useState<{ kind: "idle" | "saving" | "saved" | "error"; field?: string; message?: string }>({
    kind: "idle",
  });

  const set = (k: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setV({ ...v, [k]: e.target.value });
    if (state.kind !== "saving") setState({ kind: "idle" });
  };

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setState({ kind: "saving" });
    const res = await fetch("/api/dashboard/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(v),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      setState({
        kind: "error",
        field: json.field,
        message: json.message ?? `บันทึกไม่สำเร็จ เซิร์ฟเวอร์ตอบกลับ ${res.status} ลองรีสตาร์ท npm run dev แล้วกดบันทึกอีกครั้ง`,
      });
      return;
    }
    setV((cur) => ({ ...cur, presets: (json.presets ?? []).join(", ") }));
    setState({ kind: "saved" });
    router.refresh();
  }

  const err = (f: string) =>
    state.kind === "error" && state.field === f ? (
      <p role="alert" className="px-4 pb-3 text-[13px] text-red">
        {state.message}
      </p>
    ) : null;

  return (
    <form onSubmit={onSubmit} noValidate>
      <h3 className="mt-6 px-1 text-[13px] text-ink-3">บัญชีรับเงิน</h3>
      <div className="group-inset mt-2">
        <div>
          <Row label="พร้อมเพย์">
            <input
              value={v.promptpayId}
              onChange={set("promptpayId")}
              inputMode="numeric"
              placeholder="เบอร์มือถือ หรือ เลขบัตรประชาชน"
              className="row-field pl-0 tabular-nums"
              aria-invalid={state.field === "promptpayId"}
            />
          </Row>
          {err("promptpayId")}
        </div>
        <div>
          <Row label="ชื่อบัญชี">
            <input
              value={v.promptpayName}
              onChange={set("promptpayName")}
              placeholder="ตามที่ขึ้นในแอปธนาคาร"
              className="row-field pl-0"
              aria-invalid={state.field === "promptpayName"}
            />
          </Row>
          {err("promptpayName")}
        </div>
      </div>
      <p className="mt-2 px-1 text-[13px] text-ink-3">
        เงินโดเนทจะเข้าบัญชีที่ผูกกับพร้อมเพย์นี้ ก่อนเปิดรับจริง ลองสแกน QR ยอดเล็ก ๆ แล้วดูว่าชื่อผู้รับในแอปธนาคารเป็นของคุณ
      </p>

      <h3 className="mt-8 px-1 text-[13px] text-ink-3">หน้าโดเนท</h3>
      <div className="group-inset mt-2">
        <div>
          <Row label="ชื่อที่แสดง">
            <input value={v.displayName} onChange={set("displayName")} className="row-field pl-0" />
          </Row>
          {err("displayName")}
        </div>
        <label className="block">
          <span className="sr-only">คำแนะนำตัว</span>
          <textarea
            value={v.bio}
            onChange={set("bio")}
            rows={2}
            maxLength={160}
            placeholder="คำแนะนำตัว"
            className="row-field resize-none"
          />
        </label>
        <div>
          <Row label="ขั้นต่ำ (บาท)">
            <input
              value={v.minAmount}
              onChange={set("minAmount")}
              inputMode="numeric"
              className="row-field pl-0 tabular-nums"
            />
          </Row>
          {err("minAmount")}
        </div>
        <label className="flex cursor-pointer items-center justify-between gap-4 px-4 py-3.5">
          <span>
            <span className="block text-ink">ให้ใส่ยอดอื่นเองได้</span>
            <span className="block text-[13px] text-ink-3">
              {v.allowCustomAmount ? "ผู้ชมพิมพ์ยอดเองได้ ไม่ต่ำกว่าขั้นต่ำ" : "ผู้ชมเลือกได้เฉพาะยอดจากปุ่ม"}
            </span>
          </span>
          <input
            type="checkbox"
            role="switch"
            checked={v.allowCustomAmount}
            onChange={(e) => {
              setV({ ...v, allowCustomAmount: e.target.checked });
              setState({ kind: "idle" });
            }}
            className="peer sr-only"
          />
          <span
            aria-hidden
            className="relative h-[31px] w-[51px] shrink-0 rounded-full bg-fill transition-colors duration-200 peer-checked:bg-red peer-focus-visible:outline-3 peer-focus-visible:outline-red/45 after:absolute after:left-[2px] after:top-[2px] after:size-[27px] after:rounded-full after:bg-white after:shadow-[0_3px_8px_rgb(0_0_0/0.15),0_1px_1px_rgb(0_0_0/0.16)] after:transition-transform after:duration-200 peer-checked:after:translate-x-5"
          />
        </label>
        <div>
          <Row label="ปุ่มยอดเงิน">
            <input
              value={v.presets}
              onChange={set("presets")}
              placeholder="20, 50, 100, 300, 500"
              className="row-field pl-0 tabular-nums"
            />
          </Row>
          {err("presets")}
        </div>
      </div>
      <p className="mt-2 px-1 text-[13px] text-ink-3">ปุ่มยอดเงินใส่ได้สูงสุด 5 ค่า คั่นด้วยจุลภาค</p>

      <div className="mt-6 flex flex-wrap items-center gap-4">
        <button type="submit" disabled={state.kind === "saving"} className="btn-primary">
          {state.kind === "saving" ? "กำลังบันทึก…" : "บันทึกการตั้งค่า"}
        </button>
        <p aria-live="polite" className="text-[15px] text-ink-2">
          {state.kind === "saved" && "บันทึกแล้ว หน้าโดเนทใช้ค่าใหม่ทันที"}
          {state.kind === "error" && !state.field && <span className="text-red">{state.message}</span>}
        </p>
      </div>
    </form>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex items-center">
      <span className="w-32 shrink-0 pl-4 text-ink-2">{label}</span>
      {children}
    </label>
  );
}
