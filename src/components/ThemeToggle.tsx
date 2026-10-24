"use client";

import { useEffect, useState } from "react";

type Theme = "light" | "dark";

function resolved(): Theme {
  const t = document.documentElement.dataset.theme;
  if (t === "light" || t === "dark") return t;
  return matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

/** สลับโหมดสว่าง/มืด ค่าเริ่มต้นตามระบบ เลือกเองแล้วจำไว้ในคุกกี้ */
export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme | null>(null);

  useEffect(() => {
    setTheme(resolved());
    const mq = matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => setTheme(resolved());
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  function toggle() {
    const next: Theme = resolved() === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    // เก็บในคุกกี้ 1 ปี ให้เซิร์ฟเวอร์ใส่ data-theme มาตั้งแต่โหลดหน้า
    document.cookie = `theme=${next}; path=/; max-age=31536000; samesite=lax`;
    setTheme(next);
  }

  const dark = theme === "dark";
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={dark ? "เปลี่ยนเป็นโหมดสว่าง" : "เปลี่ยนเป็นโหมดมืด"}
      title={dark ? "โหมดสว่าง" : "โหมดมืด"}
      className="grid size-9 place-items-center rounded-full text-ink-2 transition-colors hover:bg-fill hover:text-ink"
    >
      {/* ก่อนรู้ธีม (ฝั่งเซิร์ฟเวอร์) แสดงช่องว่างขนาดเท่ากัน กันไอคอนกระโดด */}
      {theme === null ? (
        <span className="size-[18px]" />
      ) : dark ? (
        <svg viewBox="0 0 24 24" className="size-[18px]" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
          <circle cx="12" cy="12" r="4.2" />
          <path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" className="size-[18px]" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" aria-hidden>
          <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z" />
        </svg>
      )}
    </button>
  );
}
