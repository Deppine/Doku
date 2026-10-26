"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { LogoutDialog } from "./LogoutButton";

export type NavUser = { username: string; displayName: string; role: "admin" | "user" };

/** ปุ่มวงกลมชื่อผู้ใช้ กดแล้วมีเมนู แดชบอร์ด / ผู้ดูแลระบบ / ออกจากระบบ */
export function UserMenu({ user }: { user: NavUser }) {
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`เมนูของ ${user.displayName}`}
        onClick={() => setOpen((v) => !v)}
        className="grid size-8 place-items-center rounded-full bg-red text-[13px] font-semibold text-white transition-transform active:scale-95"
      >
        {user.displayName.slice(0, 1).toUpperCase()}
      </button>
      {open && (
        <div
          role="menu"
          className="menu-in absolute right-0 top-10 w-56 overflow-hidden rounded-2xl border border-line/60 bg-surface p-1.5 text-[14px] shadow-[0_18px_50px_-12px_rgb(0_0_0/0.35)]"
        >
          <div className="px-3 pb-2 pt-1.5">
            <p className="truncate font-semibold text-ink">{user.displayName}</p>
            <p className="truncate text-[12px] text-ink-3">
              @{user.username} · {user.role === "admin" ? "ผู้ดูแล" : "สตรีมเมอร์"}
            </p>
          </div>
          {/* ผู้ดูแลไม่มีแดชบอร์ดสตรีมเมอร์ เห็นแค่หน้าผู้ดูแลระบบ */}
          {user.role === "admin" ? (
            <MenuLink href="/admin" onClick={() => setOpen(false)}>
              ผู้ดูแลระบบ
            </MenuLink>
          ) : (
            <>
              <MenuLink href="/dashboard" onClick={() => setOpen(false)}>
                แดชบอร์ด
              </MenuLink>
              <MenuLink href={`/${user.username}`} onClick={() => setOpen(false)}>
                หน้าโดเนทของฉัน
              </MenuLink>
            </>
          )}
          <div className="mt-1 border-t border-line/60 pt-1">
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                setConfirm(true);
              }}
              className="w-full rounded-xl px-3 py-2 text-left text-red hover:bg-fill"
            >
              ออกจากระบบ
            </button>
          </div>
        </div>
      )}
      <LogoutDialog open={confirm} onClose={() => setConfirm(false)} />
    </div>
  );
}

function MenuLink({ href, onClick, children }: { href: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <Link href={href} role="menuitem" onClick={onClick} className="block rounded-xl px-3 py-2 text-ink hover:bg-fill">
      {children}
    </Link>
  );
}
