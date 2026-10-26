"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { APP_NAME } from "@/lib/format";
import { ThemeToggle } from "./ThemeToggle";
import { UserMenu, type NavUser } from "./UserMenu";
import { LogoMark } from "./Logo";
import { SessionTimeout } from "./SessionTimeout";
import { LogoutButton } from "./LogoutButton";

const links = [
  { href: "/", label: "หน้าแรก" },
  { href: "/streamers", label: "สตรีมเมอร์" },
  { href: "/how-to", label: "วิธีใช้งาน" },
];

export function NavBarClient({ user, expiresAt }: { user: NavUser | null; expiresAt?: number | null }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // ปิดเมนูมือถือเมื่อเปลี่ยนหน้า / กด Esc และล็อกการเลื่อนหน้าตอนเมนูเปิด
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  return (
    <>
    {user && expiresAt ? <SessionTimeout expiresAt={expiresAt} /> : null}
    <header className={`sticky top-0 z-40 ${open ? "bg-page" : "glass border-b border-line/60"}`}>
      <nav className="mx-auto flex h-12 max-w-[980px] items-center justify-between px-4" aria-label="เมนูหลัก">
        <Link href="/" className="flex items-center gap-2 text-[15px] font-semibold tracking-tight">
          <LogoMark size={24} />
          {APP_NAME}
        </Link>

        {/* เดสก์ท็อป */}
        <ul className="hidden items-center gap-1 text-[13px] sm:flex">
          {links.map((l) => (
            <li key={l.href}>
              <Link
                href={l.href}
                aria-current={isActive(l.href) ? "page" : undefined}
                className={`rounded-full px-3 py-1.5 transition-colors ${
                  isActive(l.href) ? "text-ink" : "text-ink-2 hover:text-ink"
                }`}
              >
                {l.label}
              </Link>
            </li>
          ))}
          <li>
            <ThemeToggle />
          </li>
          <li className="ml-1">
            {user ? (
              <UserMenu user={user} />
            ) : (
              <Link
                href="/login"
                className="rounded-full bg-red px-3.5 py-1.5 font-medium text-white transition-colors hover:bg-red-press"
              >
                เข้าสู่ระบบ
              </Link>
            )}
          </li>
        </ul>

        {/* มือถือ */}
        <div className="flex items-center gap-1 sm:hidden">
        <ThemeToggle />
        <button
          type="button"
          className="-mr-2 grid size-10 place-items-center"
          aria-expanded={open}
          aria-controls="mobile-menu"
          aria-label={open ? "ปิดเมนู" : "เปิดเมนู"}
          onClick={() => setOpen((v) => !v)}
        >
          <span className="relative block h-3 w-[18px]" aria-hidden>
            <span
              className={`absolute left-0 h-[1.5px] w-full rounded bg-ink transition-transform duration-300 ease-apple ${
                open ? "top-[5px] rotate-45" : "top-0"
              }`}
            />
            <span
              className={`absolute left-0 h-[1.5px] w-full rounded bg-ink transition-transform duration-300 ease-apple ${
                open ? "top-[5px] -rotate-45" : "top-[10px]"
              }`}
            />
          </span>
        </button>
        </div>
      </nav>

      {open && (
        <div id="mobile-menu" className="menu-in fixed inset-x-0 bottom-0 top-12 bg-page px-8 pt-6 sm:hidden">
          <ul className="space-y-1">
            {[...links, ...(user ? authedLinks(user) : [{ href: "/login", label: "เข้าสู่ระบบ" }])].map((l) => (
              <li key={l.href}>
                <Link
                  href={l.href}
                  aria-current={isActive(l.href) ? "page" : undefined}
                  className={`block py-2 text-[28px] font-semibold tracking-tight ${
                    isActive(l.href) ? "text-red" : "text-ink"
                  }`}
                >
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
          {user && (
            <div className="mt-8 border-t border-line pt-6">
              <p className="text-[15px] text-ink-2">
                เข้าสู่ระบบเป็น <span className="font-semibold text-ink">{user.displayName}</span>
                {user.role === "admin" && " (ผู้ดูแล)"}
              </p>
              <div className="mt-3">
                <LogoutButton className="text-[17px] font-medium text-red" />
              </div>
            </div>
          )}
        </div>
      )}
    </header>
    </>
  );
}

function authedLinks(user: NavUser) {
  // ผู้ดูแลไม่มีแดชบอร์ดสตรีมเมอร์
  return user.role === "admin" ? [{ href: "/admin", label: "ผู้ดูแลระบบ" }] : [{ href: "/dashboard", label: "แดชบอร์ด" }];
}
