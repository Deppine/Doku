"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { baht } from "@/lib/format";
import type { UserRow } from "@/lib/users";

type Role = "admin" | "user";

export function CreateUserForm() {
  const router = useRouter();
  const empty = { username: "", displayName: "", password: "", role: "user" as Role };
  const [v, setV] = useState(empty);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(v),
    });
    const json = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setMsg({ ok: false, text: json.message ?? "สร้างบัญชีไม่สำเร็จ" });
      return;
    }
    setMsg({ ok: true, text: `สร้างบัญชี @${v.username} แล้ว ส่งชื่อผู้ใช้และรหัสผ่านให้เจ้าของบัญชีได้เลย` });
    setV(empty);
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="mt-4" noValidate>
      <div className="group-inset">
        <Row label="ชื่อผู้ใช้">
          <input
            value={v.username}
            onChange={(e) => setV({ ...v, username: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "") })}
            placeholder="ใช้ล็อกอินและเป็นลิงก์หน้าโดเนท"
            autoCapitalize="none"
            className="row-field pl-0"
          />
        </Row>
        <Row label="ชื่อที่แสดง">
          <input
            value={v.displayName}
            onChange={(e) => setV({ ...v, displayName: e.target.value })}
            placeholder="ชื่อบนหน้าโดเนท"
            className="row-field pl-0"
          />
        </Row>
        <Row label="รหัสผ่าน">
          <input
            type="text"
            value={v.password}
            onChange={(e) => setV({ ...v, password: e.target.value })}
            placeholder="อย่างน้อย 8 ตัว"
            autoComplete="new-password"
            className="row-field pl-0"
          />
        </Row>
        <div className="flex items-center justify-between gap-4 px-4 py-3">
          <span className="text-ink-2">สิทธิ์</span>
          <RoleSwitch value={v.role} onChange={(role) => setV({ ...v, role })} />
        </div>
      </div>
      {v.username && <p className="mt-2 px-1 text-[13px] text-ink-3">หน้าโดเนทจะอยู่ที่ /{v.username}</p>}
      <div className="mt-5 flex flex-wrap items-center gap-4">
        <button type="submit" disabled={busy} className="btn-primary">
          {busy ? "กำลังสร้าง…" : "สร้างบัญชี"}
        </button>
        {msg && (
          <p role={msg.ok ? "status" : "alert"} className={`text-[15px] ${msg.ok ? "text-ink-2" : "text-red"}`}>
            {msg.text}
          </p>
        )}
      </div>
    </form>
  );
}

export function UserList({ users, meId }: { users: UserRow[]; meId: number }) {
  return (
    <ul className="group-inset mt-4">
      {users.map((u) => (
        <UserItem key={u.id} u={u} isMe={u.id === meId} />
      ))}
    </ul>
  );
}

function UserItem({ u, isMe }: { u: UserRow; isMe: boolean }) {
  const router = useRouter();
  const [mode, setMode] = useState<"idle" | "password">("idle");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function call(method: "PATCH" | "DELETE", body?: object, okText?: string) {
    setBusy(true);
    setMsg(null);
    const res = await fetch(`/api/admin/users/${u.id}`, {
      method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    const json = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setMsg({ ok: false, text: json.message ?? "ทำรายการไม่สำเร็จ" });
      return false;
    }
    if (okText) setMsg({ ok: true, text: okText });
    router.refresh();
    return true;
  }

  return (
    <li className="px-5 py-4">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
        <span
          aria-hidden
          className="grid size-10 shrink-0 place-items-center rounded-full bg-red text-[16px] font-semibold text-white"
        >
          {u.displayName.slice(0, 1).toUpperCase()}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">
            {u.displayName}
            {isMe && <span className="ml-2 text-[13px] font-normal text-ink-3">(คุณ)</span>}
          </p>
          <p className="truncate text-[13px] text-ink-3">
            @{u.username} · {u.hasPayment ? "ตั้งพร้อมเพย์แล้ว" : "ยังไม่ตั้งพร้อมเพย์"} · โดเนท {u.donationCount} รายการ ฿
            {baht(u.donationTotal)}
          </p>
        </div>
        <RoleSwitch
          value={u.role}
          disabled={busy}
          onChange={(role) => call("PATCH", { role }, role === "admin" ? "เปลี่ยนเป็นผู้ดูแลแล้ว" : "เปลี่ยนเป็นสตรีมเมอร์แล้ว")}
        />
      </div>

      {mode === "password" ? (
        <form
          className="mt-3 flex flex-wrap items-center gap-2"
          onSubmit={async (e) => {
            e.preventDefault();
            if (await call("PATCH", { password }, "เปลี่ยนรหัสผ่านแล้ว")) {
              setPassword("");
              setMode("idle");
            }
          }}
        >
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="รหัสผ่านใหม่ อย่างน้อย 8 ตัว"
            autoComplete="new-password"
            autoFocus
            className="min-w-0 flex-1 rounded-xl bg-paper px-3 py-2 text-[15px] focus:outline-none focus-visible:ring-2 focus-visible:ring-red/40"
          />
          <button type="submit" disabled={busy} className="btn-primary px-4 py-2 text-[15px]">
            บันทึก
          </button>
          <button type="button" onClick={() => setMode("idle")} className="btn-quiet px-3 py-2 text-ink-2">
            ยกเลิก
          </button>
        </form>
      ) : (
        <div className="mt-2 flex flex-wrap gap-1 pl-14">
          <button type="button" onClick={() => setMode("password")} className="btn-quiet px-3 py-1.5 text-[14px]">
            เปลี่ยนรหัสผ่าน
          </button>
          {!isMe && (
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                if (window.confirm(`ลบบัญชี @${u.username}? ทำย้อนกลับไม่ได้`)) call("DELETE");
              }}
              className="btn-quiet px-3 py-1.5 text-[14px] text-ink-2 hover:text-red"
            >
              ลบบัญชี
            </button>
          )}
        </div>
      )}
      {msg && (
        <p role={msg.ok ? "status" : "alert"} className={`mt-2 pl-14 text-[13px] ${msg.ok ? "text-ink-2" : "text-red"}`}>
          {msg.text}
        </p>
      )}
    </li>
  );
}

/** ตัวเลือกสิทธิ์แบบแถบแบ่งส่วนของ iOS */
function RoleSwitch({ value, onChange, disabled }: { value: Role; onChange: (r: Role) => void; disabled?: boolean }) {
  const opts: { v: Role; label: string }[] = [
    { v: "user", label: "สตรีมเมอร์" },
    { v: "admin", label: "ผู้ดูแล" },
  ];
  return (
    <div role="radiogroup" aria-label="สิทธิ์" className="inline-grid shrink-0 grid-cols-2 gap-1 rounded-full bg-fill p-1 text-[13px]">
      {opts.map((o) => (
        <button
          key={o.v}
          type="button"
          role="radio"
          aria-checked={value === o.v}
          disabled={disabled}
          onClick={() => value !== o.v && onChange(o.v)}
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

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex items-center">
      <span className="w-28 shrink-0 pl-4 text-ink-2">{label}</span>
      {children}
    </label>
  );
}
