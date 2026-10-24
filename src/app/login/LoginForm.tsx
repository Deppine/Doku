"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function LoginForm({ next, canRegister }: { next: string | null; canRegister: boolean }) {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!username || !password) {
      setError("กรอกชื่อผู้ใช้และรหัสผ่าน");
      return;
    }
    setBusy(true);
    setError(null);
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password, next }),
    });
    const json = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(json.message ?? "เข้าสู่ระบบไม่สำเร็จ");
      return;
    }
    router.replace(json.redirect ?? "/dashboard");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="mt-8 text-left" noValidate>
      <div className="group-inset">
        <label className="block">
          <span className="sr-only">ชื่อผู้ใช้</span>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            autoCapitalize="none"
            placeholder="ชื่อผู้ใช้"
            className="row-field"
          />
        </label>
        <label className="block">
          <span className="sr-only">รหัสผ่าน</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            placeholder="รหัสผ่าน"
            className="row-field"
          />
        </label>
      </div>
      {error && (
        <p role="alert" className="mt-3 text-center text-[15px] text-red">
          {error}
        </p>
      )}
      <button type="submit" disabled={busy} className="btn-primary mt-5 w-full">
        {busy ? "กำลังเข้าสู่ระบบ…" : "เข้าสู่ระบบ"}
      </button>
      {canRegister ? (
        <p className="mt-6 text-center text-[15px] text-ink-2">
          ยังไม่มีบัญชี?{" "}
          <Link href="/register" className="link">
            สมัครสมาชิก
          </Link>
        </p>
      ) : (
        <p className="mt-6 text-center text-[13px] text-ink-3">ยังไม่มีบัญชี ติดต่อผู้ดูแลเพื่อขอสร้างบัญชี</p>
      )}
    </form>
  );
}
