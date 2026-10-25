"use client";

import { useEffect } from "react";

/**
 * ครบเวลา session (1 วัน) → ออกจากระบบเองแม้เปิดหน้าค้างไว้
 * เช็กทุก 30 วิ และตอนกลับมาที่แท็บ (setTimeout อย่างเดียวพลาดได้ตอนเครื่องหลับ)
 */
export function SessionTimeout({ expiresAt }: { expiresAt: number }) {
  useEffect(() => {
    let done = false;
    const check = async () => {
      if (done || Date.now() < expiresAt) return;
      done = true;
      await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
      location.href = "/login?expired=1";
    };
    const id = setInterval(check, 30_000);
    const t = setTimeout(check, Math.max(0, expiresAt - Date.now()) + 1000);
    const onVis = () => document.visibilityState === "visible" && check();
    document.addEventListener("visibilitychange", onVis);
    check();
    return () => {
      clearInterval(id);
      clearTimeout(t);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [expiresAt]);
  return null;
}
