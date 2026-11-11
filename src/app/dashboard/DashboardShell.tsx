"use client";

import { useEffect, useState, type ReactNode } from "react";
import { LogoutDialog } from "@/components/LogoutButton";

export type DashSection = {
  id: string;
  group: string;
  label: string;
  icon: IconName;
  title: string;
  desc?: string;
  badge?: string;
  content: ReactNode;
};

const KEY = "doku:dash-section";

/**
 * โครงแดชบอร์ดสตรีมเมอร์: เมนูด้านซ้ายแบ่งกลุ่ม (จอใหญ่) / แถบเมนูเลื่อนแนวนอนด้านบน (มือถือ)
 * เปิดเมนูตรงได้ด้วยลิงก์ #id และจำเมนูล่าสุดไว้ในเบราว์เซอร์นี้
 */
export function DashboardShell({ sections }: { sections: DashSection[] }) {
  const [active, setActive] = useState(sections[0].id);
  const [logout, setLogout] = useState(false);
  const ids = sections.map((s) => s.id).join(",");

  useEffect(() => {
    const list = ids.split(",");
    const fromHash = () => {
      const h = location.hash.slice(1);
      if (list.includes(h)) {
        setActive(h);
        window.scrollTo({ top: 0 });
      }
    };
    try {
      const saved = localStorage.getItem(KEY);
      if (saved && list.includes(saved)) setActive(saved);
    } catch {}
    fromHash();
    window.addEventListener("hashchange", fromHash);
    return () => window.removeEventListener("hashchange", fromHash);
  }, [ids]);

  function choose(id: string) {
    setActive(id);
    try {
      localStorage.setItem(KEY, id);
    } catch {}
    if (location.hash) history.replaceState(null, "", location.pathname + location.search);
    window.scrollTo({ top: 0 });
  }

  const groups = [...new Set(sections.map((s) => s.group))];
  const current = sections.find((s) => s.id === active) ?? sections[0];

  return (
    <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:gap-7">
      {/* เมนูจอใหญ่ */}
      <nav aria-label="เมนูแดชบอร์ด" className="sticky top-20 hidden w-[232px] shrink-0 rounded-[22px] bg-surface p-3 lg:block">
        {groups.map((g, gi) => (
          <div key={g} className={gi ? "mt-3 border-t border-line/60 pt-3" : ""}>
            <p className="px-3 pb-1.5 text-[12px] font-semibold text-ink-3">{g}</p>
            <ul className="space-y-0.5">
              {sections
                .filter((s) => s.group === g)
                .map((s) => (
                  <li key={s.id}>
                    <MenuButton s={s} active={s.id === current.id} onClick={() => choose(s.id)} />
                  </li>
                ))}
            </ul>
          </div>
        ))}
        <div className="mt-3 border-t border-line/60 pt-3">
          <button
            type="button"
            onClick={() => setLogout(true)}
            className="flex min-h-10 w-full items-center gap-3 rounded-xl px-3 text-[14px] font-semibold text-red hover:bg-red/10"
          >
            <Icon name="logout" />
            ออกจากระบบ
          </button>
        </div>
      </nav>

      {/* เมนูมือถือ: เลื่อนแนวนอน */}
      <nav aria-label="เมนูแดชบอร์ด" className="sticky top-14 z-20 -mx-4 bg-paper/85 px-4 py-2 backdrop-blur lg:hidden">
        <ul className="no-scrollbar flex gap-1.5 overflow-x-auto">
          {sections.map((s) => (
            <li key={s.id} className="shrink-0">
              <button
                type="button"
                aria-current={s.id === current.id ? "page" : undefined}
                onClick={() => choose(s.id)}
                className={`flex min-h-10 items-center gap-2 rounded-full px-3.5 text-[14px] font-semibold transition-colors ${
                  s.id === current.id ? "bg-red text-white" : "bg-surface text-ink-2"
                }`}
              >
                <Icon name={s.icon} />
                {s.label}
              </button>
            </li>
          ))}
        </ul>
      </nav>

      <div className="min-w-0 flex-1">
        <header className="mb-4">
          <h1 className="display text-[28px] sm:text-[32px]">{current.title}</h1>
          {current.desc && <p className="mt-1 text-[15px] text-ink-2">{current.desc}</p>}
        </header>
        {sections.map((s) => (
          <div key={s.id} hidden={s.id !== current.id}>
            {s.content}
          </div>
        ))}
      </div>

      <LogoutDialog open={logout} onClose={() => setLogout(false)} />
    </div>
  );
}

function MenuButton({ s, active, onClick }: { s: DashSection; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-current={active ? "page" : undefined}
      onClick={onClick}
      className={`flex min-h-10 w-full items-center gap-3 rounded-xl px-3 text-left text-[14px] font-semibold transition-colors ${
        active ? "bg-red/15 text-red" : "text-ink-2 hover:bg-fill hover:text-ink"
      }`}
    >
      <Icon name={s.icon} />
      <span className="min-w-0 flex-1 truncate">{s.label}</span>
      {s.badge && <span className="rounded-full bg-red px-1.5 text-[11px] font-bold leading-5 text-white">{s.badge}</span>}
    </button>
  );
}

/** การ์ดตั้งค่าแบบ 2 คอลัมน์: ซ้าย = ไอคอน + หัวข้อ + คำอธิบาย, ขวา = ตัวตั้งค่า (มือถือเรียงบนลงล่าง) */
export function SettingBlock({
  icon,
  title,
  desc,
  children,
}: {
  icon: IconName;
  title: string;
  desc?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="grid gap-4 rounded-[22px] bg-surface p-5 sm:p-6 md:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] md:gap-8">
      <div>
        <span aria-hidden className="grid size-11 place-items-center rounded-2xl bg-red/12 text-red">
          <Icon name={icon} size={22} />
        </span>
        <h2 className="mt-3 text-[18px] font-semibold">{title}</h2>
        {desc && <div className="mt-1 text-[14px] leading-relaxed text-ink-2">{desc}</div>}
      </div>
      <div className="min-w-0">{children}</div>
    </section>
  );
}

export type IconName = "home" | "wallet" | "page" | "bell" | "sound" | "goal" | "qr" | "logout" | "list" | "image";

const PATHS: Record<IconName, string> = {
  home: "M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z",
  wallet: "M3 7a2 2 0 0 1 2-2h13v4M3 7v11a2 2 0 0 0 2 2h15V9H5a2 2 0 0 1-2-2zm13 7h.01",
  page: "M6 3h9l4 4v14H6zM14 3v5h5M9 13h7M9 17h5",
  bell: "M6 16V11a6 6 0 1 1 12 0v5l2 2H4zM10 21h4",
  sound: "M4 9v6h4l5 4V5L8 9zM16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12",
  goal: "M12 21a9 9 0 1 1 0-18 9 9 0 0 1 0 18zm0-4a5 5 0 1 1 0-10 5 5 0 0 1 0 10zm0-4a1 1 0 1 1 0-2 1 1 0 0 1 0 2z",
  qr: "M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h2v2h-2zM18 18h2v2h-2zM14 18h2M18 14h2",
  logout: "M15 4h4a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-4M10 17l-5-5 5-5M5 12h11",
  list: "M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01",
  image: "M4 5h16v14H4zM4 16l5-5 4 4 2-2 5 5M15 9.5h.01",
};

export function Icon({ name, size = 18 }: { name: IconName; size?: number }) {
  return (
    <svg aria-hidden width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
      <path d={PATHS[name]} />
    </svg>
  );
}
