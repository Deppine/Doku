"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type Field = "username" | "displayName" | "password" | "confirm";

export function RegisterForm() {
  const router = useRouter();
  const [v, setV] = useState({ username: "", displayName: "", password: "", confirm: "", website: "" });
  const [check, setCheck] = useState<{ state: "idle" | "checking" | "ok" | "bad"; message?: string }>({ state: "idle" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ field?: Field; message: string } | null>(null);

  // เช็คชื่อผู้ใช้หลังหยุดพิมพ์ 0.4 วินาที
  useEffect(() => {
    if (v.username.length < 3) {
      setCheck({ state: "idle" });
      return;
    }
    setCheck({ state: "checking" });
    const t = setTimeout(async () => {
      const res = await fetch(`/api/auth/username?u=${encodeURIComponent(v.username)}`).catch(() => null);
      const json = await res?.json().catch(() => null);
      if (!json) return setCheck({ state: "idle" });
      setCheck(json.available ? { state: "ok" } : { state: "bad", message: json.message });
    }, 400);
    return () => clearTimeout(t);
  }, [v.username]);

  const set = (k: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = k === "username" ? e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "") : e.target.value;
    setV({ ...v, [k]: value });
    if (error) setError(null);
  };

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (v.password !== v.confirm) {
      setError({ field: "confirm", message: "รหัสผ่านสองช่องไม่ตรงกัน" });
      return;
    }
    if (check.state === "bad") {
      setError({ field: "username", message: check.message ?? "ใช้ชื่อนี้ไม่ได้" });
      return;
    }
    setBusy(true);
    setError(null);
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: v.username, displayName: v.displayName, password: v.password, website: v.website }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      setBusy(false);
      setError({ field: json.field, message: json.message ?? "สมัครไม่สำเร็จ ลองใหม่อีกครั้ง" });
      return;
    }
    router.replace(json.redirect ?? "/dashboard");
    router.refresh();
  }

  const hint = (f: Field) =>
    error?.field === f ? (
      <p role="alert" className="px-4 pb-3 text-[13px] text-red">
        {error.message}
      </p>
    ) : null;

  return (
    <form onSubmit={onSubmit} className="mt-8 text-left" noValidate>
      <div className="group-inset">
        <div>
          <label className="block">
            <span className="sr-only">ชื่อผู้ใช้</span>
            <input
              value={v.username}
              onChange={set("username")}
              autoComplete="username"
              autoCapitalize="none"
              placeholder="ชื่อผู้ใช้ (a-z 0-9 _)"
              maxLength={30}
              className="row-field"
              aria-invalid={error?.field === "username" || check.state === "bad"}
            />
          </label>
          {v.username.length >= 3 && error?.field !== "username" && (
            <p
              aria-live="polite"
              className={`px-4 pb-3 text-[13px] ${check.state === "bad" ? "text-red" : check.state === "ok" ? "text-[#1f9d55]" : "text-ink-3"}`}
            >
              {check.state === "checking" && "กำลังเช็คชื่อ…"}
              {check.state === "ok" && `ใช้ได้ หน้าโดเนทของคุณคือ /${v.username}`}
              {check.state === "bad" && check.message}
            </p>
          )}
          {hint("username")}
        </div>
        <div>
          <label className="block">
            <span className="sr-only">ชื่อที่แสดง</span>
            <input
              value={v.displayName}
              onChange={set("displayName")}
              placeholder="ชื่อที่แสดงบนหน้าโดเนท"
              maxLength={100}
              className="row-field"
            />
          </label>
          {hint("displayName")}
        </div>
        <div>
          <label className="block">
            <span className="sr-only">รหัสผ่าน</span>
            <input
              type="password"
              value={v.password}
              onChange={set("password")}
              autoComplete="new-password"
              placeholder="รหัสผ่าน อย่างน้อย 8 ตัว"
              className="row-field"
            />
          </label>
          {hint("password")}
        </div>
        <div>
          <label className="block">
            <span className="sr-only">ยืนยันรหัสผ่าน</span>
            <input
              type="password"
              value={v.confirm}
              onChange={set("confirm")}
              autoComplete="new-password"
              placeholder="ยืนยันรหัสผ่าน"
              className="row-field"
            />
          </label>
          {hint("confirm")}
        </div>
      </div>

      {/* ช่องดักบอท ซ่อนจากคนจริง */}
      <input
        type="text"
        name="website"
        value={v.website}
        onChange={(e) => setV({ ...v, website: e.target.value })}
        tabIndex={-1}
        autoComplete="off"
        aria-hidden
        className="absolute left-[-9999px] h-0 w-0 opacity-0"
      />

      {error && !error.field && (
        <p role="alert" className="mt-3 text-center text-[15px] text-red">
          {error.message}
        </p>
      )}
      <button type="submit" disabled={busy} className="btn-primary mt-5 w-full">
        {busy ? "กำลังสร้างบัญชี…" : "สร้างบัญชี"}
      </button>
    </form>
  );
}
