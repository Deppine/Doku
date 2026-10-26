"use client";

import { useEffect, useRef, useState } from "react";

/** ปุ่มออกจากระบบพร้อมหน้าต่างยืนยัน (ใช้ในเมนูมือถือ) */
export function LogoutButton({ className }: { className: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={className}>
        ออกจากระบบ
      </button>
      <LogoutDialog open={open} onClose={() => setOpen(false)} />
    </>
  );
}

/** หน้าต่างยืนยันออกจากระบบ (dialog กลางจอ) · ยืนยันแล้วพาไปหน้าเข้าสู่ระบบพร้อมข้อความแจ้ง */
export function LogoutDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  async function logout() {
    setBusy(true);
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
    location.href = "/login?loggedout=1";
  }

  return (
    <dialog
      ref={ref}
      aria-labelledby="logout-h"
      onClose={onClose}
      onClick={(e) => e.target === ref.current && !busy && onClose()}
      className="m-auto w-[min(360px,calc(100vw-32px))] rounded-[24px] bg-surface p-0 text-ink shadow-[0_30px_80px_-20px_rgb(0_0_0/0.6)] backdrop:bg-black/60 backdrop:backdrop-blur-sm"
    >
      <div className="p-6 text-center">
        <span aria-hidden className="mx-auto grid size-12 place-items-center rounded-full bg-red/15 text-red">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
          </svg>
        </span>
        <h2 id="logout-h" className="mt-4 text-[20px] font-semibold tracking-tight">
          ออกจากระบบ?
        </h2>
        <p className="mt-1.5 text-[15px] text-ink-2">วิดเจ็ตใน OBS ยังทำงานต่อตามปกติ แจ้งเตือนโดเนทยังขึ้นจอ</p>
        <div className="mt-6 grid grid-cols-2 gap-2">
          <button type="button" autoFocus disabled={busy} onClick={onClose} className="min-h-11 rounded-full bg-fill px-4 py-2.5 text-[15px] font-semibold text-ink hover:bg-fill-hover">
            ยกเลิก
          </button>
          <button type="button" disabled={busy} onClick={logout} className="btn-primary min-h-11 justify-center py-2.5 text-[15px]">
            {busy ? "กำลังออก…" : "ออกจากระบบ"}
          </button>
        </div>
      </div>
    </dialog>
  );
}
