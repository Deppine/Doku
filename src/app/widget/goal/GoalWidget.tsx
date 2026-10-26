"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { baht } from "@/lib/format";
import type { GoalStyle } from "@/lib/streamer-stats";

type Goal = { title: string; target: number; raised: number; style?: GoalStyle };

/**
 * หลอดเป้าหมายใน OBS อัปเดตเองทุก 10 วินาที
 * neon  = แคปซูลนีออน (ออกแบบที่ 600 × 160)
 * tube  = หลอดแก้วเก็บเงิน แนวตั้ง (ออกแบบที่ 360 × 640)
 * ring  = วงแหวนมุมจอ ป้ายเล็ก (ออกแบบที่ 300 × 90)
 * ทั้งสามแบบย่อ/ขยายให้พอดี Browser Source เองโดยคงสัดส่วน ตั้งกล่องใน OBS ขนาดไหนก็ไม่ยืดเบี้ยว
 * edge  = เส้นขอบจอ ยืดเต็มความกว้าง Browser Source (แนะนำ 1920 × 80 วางชิดขอบล่างของฉาก)
 * basic = การ์ดเรียบแบบเดิม
 */
export function GoalWidget({ token, light, forced }: { token: string; light: boolean; forced: GoalStyle | null }) {
  const [goal, setGoal] = useState<Goal | null>(null);
  const [error, setError] = useState(false);
  // ยอดเพิ่ม → หยอดเหรียญ (หลอดแก้ว) / เรืองแรงขึ้นชั่วครู่ (นีออน)
  const [bump, setBump] = useState(0);
  const last = useRef<number | null>(null);

  useEffect(() => {
    let stop = false;
    const load = async () => {
      const res = await fetch(`/api/widget/goal?token=${encodeURIComponent(token)}`, { cache: "no-store" }).catch(() => null);
      if (stop) return;
      if (!res?.ok) return setError(true);
      setError(false);
      const g: Goal | null = (await res.json()).goal;
      if (g && last.current !== null && g.raised > last.current) setBump((n) => n + 1);
      last.current = g?.raised ?? null;
      setGoal(g);
    };
    load();
    const t = setInterval(load, 10_000);
    return () => {
      stop = true;
      clearInterval(t);
    };
  }, [token]);

  if (error) return <p className="m-4 inline-block rounded-full bg-red px-3 py-1.5 text-[13px] text-white">ลิงก์วิดเจ็ตไม่ถูกต้อง</p>;
  if (!goal) return null;
  const pct = Math.min(100, (goal.raised / goal.target) * 100);
  const style = forced ?? goal.style ?? "neon";
  if (style === "tube") return <Tube goal={goal} pct={pct} bump={bump} />;
  if (style === "neon") return <Neon goal={goal} pct={pct} bump={bump} />;
  if (style === "ring") return <Ring goal={goal} pct={pct} bump={bump} />;
  if (style === "edge") return <Edge goal={goal} pct={pct} bump={bump} />;
  return <Basic goal={goal} pct={pct} light={light} />;
}

type View = { goal: Goal; pct: number; bump: number };

/** 1 · แคปซูลนีออน */
function Neon({ goal, pct, bump }: View) {
  const done = pct >= 100;
  return (
    <Fit w={600} h={160}>
      <div className="relative m-5 w-[560px] rounded-[20px] text-white bg-[linear-gradient(135deg,rgba(18,18,22,.92),rgba(40,10,14,.92))] px-5 pb-4 pt-3.5 shadow-[0_0_0_1px_rgba(255,59,48,.45),0_10px_30px_rgba(0,0,0,.5)]">
        <div className="flex items-baseline gap-3">
          <p className="min-w-0 truncate text-[20px] font-bold">{goal.title}</p>
          <p className="ml-auto shrink-0 text-[18px] font-bold tabular-nums text-[#ff6b5e]">{done ? "ครบเป้าแล้ว!" : `${Math.floor(pct)}%`}</p>
        </div>
        <div className="relative mt-3 h-[22px] rounded-full bg-white/10 shadow-[inset_0_1px_3px_rgba(0,0,0,.6)]">
          <div
            key={bump}
            className={`goal-neon-fill absolute inset-y-0 left-0 rounded-full transition-[width] duration-1000 ease-out ${bump ? "goal-neon-bump" : ""}`}
            style={{ width: `${Math.max(3, pct)}%` }}
          />
          <span
            aria-hidden
            className="absolute top-1/2 size-4 -translate-y-1/2 rounded-full bg-white shadow-[0_0_12px_#fff,0_0_24px_#ff3b30] transition-[left] duration-1000 ease-out"
            style={{ left: `calc(${Math.max(3, pct)}% - 11px)` }}
          />
        </div>
        <div className="mt-2.5 flex text-[16px] tabular-nums">
          <b>฿{baht(goal.raised)}</b>
          <span className="text-white/60">&nbsp;/ ฿{baht(goal.target)}</span>
          {!done && <span className="ml-auto text-white/60">อีก ฿{baht(Math.max(0, goal.target - goal.raised))}</span>}
        </div>
      </div>
    </Fit>
  );
}

/** วงแหวนมุมจอ: ป้ายเม็ดยา วงแหวนเติมตาม % เด้ง +฿ เมื่อมีโดเนท */
function Ring({ goal, pct, bump }: View) {
  const done = pct >= 100;
  const [plus, setPlus] = useState<number | null>(null);
  const prev = useRef(goal.raised);
  useEffect(() => {
    if (!bump) return;
    setPlus(goal.raised - prev.current);
    prev.current = goal.raised;
    const t = setTimeout(() => setPlus(null), 1700);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bump]);
  return (
    <Fit w={300} h={90}>
      <div className="m-[9px] inline-flex max-w-[282px] items-center gap-3 rounded-full bg-[rgba(10,10,12,.78)] py-1.5 pl-1.5 pr-5 text-white shadow-[0_0_0_1px_rgba(255,255,255,.08)]">
        <div
          key={bump}
          className={`relative grid size-[60px] shrink-0 place-items-center rounded-full shadow-[0_0_16px_rgba(255,59,48,.45)] transition-[background] duration-1000 ${bump ? "goal-ring-pop" : ""}`}
          style={{ background: `conic-gradient(${done ? "#30d158" : "#ff3b30"} ${pct * 3.6}deg, rgba(255,255,255,.12) 0deg)` }}
        >
          <div className="grid size-12 place-items-center rounded-full bg-[#121214]">
            <b className="text-[15px] tabular-nums">{done ? "✓" : `${Math.floor(pct)}%`}</b>
          </div>
          {plus !== null && plus > 0 && (
            <span className="goal-ring-plus absolute -top-2 left-1/2 w-20 -translate-x-1/2 text-center text-[13px] font-bold text-[#ff6b5e]">+฿{baht(plus)}</span>
          )}
        </div>
        <div className="min-w-0">
          <p className="truncate text-[13px] leading-tight text-white/65">{goal.title}</p>
          <p className="mt-0.5 truncate text-[17px] font-bold leading-tight tabular-nums">
            ฿{baht(goal.raised)}
            <span className="font-normal text-white/50"> / ฿{baht(goal.target)}</span>
          </p>
        </div>
      </div>
    </Fit>
  );
}

/** เส้นขอบจอ: เส้นเรืองบางชิดขอบล่าง ป้ายเล็กวิ่งตามปลายเส้น (ยืดเต็มความกว้าง) */
function Edge({ goal, pct, bump }: View) {
  const done = pct >= 100;
  const w = Math.max(1, pct);
  return (
    <main className="fixed inset-0 overflow-hidden text-white">
      <div
        className="absolute bottom-[calc(0.6vw+10px)] -translate-x-1/2 transition-[left] duration-1000 ease-out"
        style={{ left: `clamp(110px, ${w}%, calc(100% - 110px))` }}
      >
        <div
          key={bump}
          className="goal-chip-in flex items-center gap-2 whitespace-nowrap rounded-full bg-[rgba(10,10,12,.85)] px-3.5 py-1.5 text-[clamp(12px,1vw,22px)] shadow-[0_0_0_1px_rgba(255,59,48,.5)]"
        >
          <span aria-hidden className="size-2 rounded-full bg-[#ff3b30] shadow-[0_0_6px_#ff3b30]" />
          <b className="max-w-[40vw] truncate">{goal.title}</b>
          <span className="font-bold tabular-nums text-[#ff8a80]">{done ? "ครบเป้า!" : `${Math.floor(pct)}%`}</span>
          <span className="tabular-nums text-white/55">฿{baht(goal.raised)}</span>
        </div>
      </div>
      <div className="absolute inset-x-0 bottom-0 h-[max(4px,0.3vw)] bg-white/10">
        <div
          key={bump}
          className={`h-full bg-[linear-gradient(90deg,#c40000,#ff3b30_80%,#ffb3ad)] shadow-[0_0_10px_1px_rgba(255,59,48,.7)] transition-[width] duration-1000 ease-out ${bump ? "goal-edge-flash" : ""}`}
          style={{ width: `${w}%` }}
        />
      </div>
    </main>
  );
}

/** 3 · หลอดแก้วเก็บเงิน (สูงเต็ม Browser Source) */
function Tube({ goal, pct, bump }: View) {
  const done = pct >= 100;
  return (
    <Fit w={360} h={640}>
      <div className="flex h-full items-stretch justify-end gap-4 p-5 text-white">
      <div className="flex min-w-0 flex-col justify-between py-1 text-right [text-shadow:0_2px_10px_rgba(0,0,0,.7)]">
        <div>
          <p className="text-[14px] text-white/70">เป้าหมาย</p>
          <p className="text-[20px] font-bold leading-tight [overflow-wrap:anywhere]">{goal.title}</p>
        </div>
        <div>
          {done && <p className="goal-done mb-2 inline-block rounded-xl bg-white px-3 py-1.5 text-[16px] font-bold text-[#1d1d1f] [text-shadow:none]">🎉 เต็มหลอดแล้ว!</p>}
          <p className="text-[38px] font-bold leading-none tabular-nums">฿{baht(goal.raised)}</p>
          <p className="mt-1 text-[15px] tabular-nums text-white/75">
            จาก ฿{baht(goal.target)} · {Math.floor(pct)}%
          </p>
        </div>
      </div>
      <div className="relative w-[84px] shrink-0">
        <div aria-hidden className="absolute left-1/2 top-[-6px] h-3 w-12 -translate-x-1/2 rounded bg-[#2c2c2e] shadow-[inset_0_0_0_1px_rgba(255,255,255,.15)]" />
        <div className="absolute inset-x-0 bottom-0 top-1 overflow-hidden rounded-[42px] bg-white/[.06] shadow-[inset_0_0_0_2px_rgba(255,255,255,.22),inset_6px_0_10px_rgba(255,255,255,.08)]">
          <div className="absolute inset-x-0 bottom-0 bg-[linear-gradient(180deg,#ff5a4f,#c40000)] transition-[height] duration-1000 ease-out" style={{ height: `${Math.max(3, pct)}%` }}>
            <Wave className="goal-wave absolute left-0 top-[-12px]" fill="#ff5a4f" />
            <Wave className="goal-wave2 absolute left-0 top-[-9px] opacity-50" fill="#ff8a80" />
            {/* ฟองอากาศเฉพาะตอนมีน้ำพอ ไม่งั้นลอยกลางหลอดเปล่า */}
            {pct >= 12 && (
              <>
                <span className="goal-bubble left-4" />
                <span className="goal-bubble left-10 size-1 [animation-delay:1.1s]" />
                <span className="goal-bubble left-14 [animation-delay:2.2s]" />
              </>
            )}
          </div>
          <div aria-hidden className="absolute bottom-3 left-3 top-3 w-1.5 rounded bg-[linear-gradient(180deg,rgba(255,255,255,.35),rgba(255,255,255,.05))]" />
          <div aria-hidden className="absolute inset-y-0 right-0 w-4 bg-[repeating-linear-gradient(180deg,transparent_0_24.5%,rgba(255,255,255,.35)_24.5%_25%)]" />
        </div>
        {bump > 0 && (
          <span
            key={bump}
            aria-hidden
            className="goal-coin absolute left-1/2 top-0 grid size-8 -ml-4 place-items-center rounded-full bg-[radial-gradient(circle_at_35%_35%,#fff3b0,#ffd60a_50%,#c99a00)] text-[15px] font-bold text-[#7a5a00] shadow-[0_0_10px_rgba(255,214,10,.7)]"
          >
            ฿
          </span>
        )}
      </div>
      </div>
    </Fit>
  );
}

/**
 * เวทีขนาดคงที่ (w × h) ที่ย่อ/ขยายให้พอดีหน้าต่าง Browser Source โดยคงสัดส่วน และวางกึ่งกลาง
 * ทำให้ปรับขนาดใน OBS ได้อิสระ (ลากมุมกล่อง หรือแก้ Width/Height) หลอดไม่ยืดเบี้ยว
 */
function Fit({ w, h, children }: { w: number; h: number; children: ReactNode }) {
  const [scale, setScale] = useState(1);
  useEffect(() => {
    const fit = () => setScale(Math.min(window.innerWidth / w, window.innerHeight / h));
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, [w, h]);
  return (
    <main className="fixed inset-0 overflow-hidden">
      <div
        className="absolute left-1/2 top-1/2"
        style={{ width: w, height: h, transform: `translate(-50%, -50%) scale(${scale})`, transformOrigin: "center" }}
      >
        {children}
      </div>
    </main>
  );
}

function Wave({ className, fill }: { className: string; fill: string }) {
  return (
    <svg aria-hidden className={className} width="336" height="14" viewBox="0 0 336 14">
      <path d="M0 8 Q21 0 42 8 T84 8 T126 8 T168 8 T210 8 T252 8 T294 8 T336 8 V14 H0Z" fill={fill} />
    </svg>
  );
}

/** แบบเรียบ (เดิม) */
function Basic({ goal, pct, light }: { goal: Goal; pct: number; light: boolean }) {
  return (
    <main className="p-4">
      <div
        className="w-[560px] max-w-full rounded-[22px] px-6 py-5 shadow-[0_12px_40px_rgb(0_0_0/0.35)]"
        style={{ background: light ? "#ffffff" : "rgba(20,20,22,0.92)", color: light ? "#1d1d1f" : "#f5f5f7" }}
      >
        <div className="flex items-baseline justify-between gap-4">
          <p className="truncate text-[20px] font-bold">{goal.title}</p>
          <p className="shrink-0 text-[15px] font-semibold opacity-70">{Math.floor(pct)}%</p>
        </div>
        <div className="mt-3 h-4 overflow-hidden rounded-full" style={{ background: light ? "rgba(0,0,0,0.08)" : "rgba(255,255,255,0.14)" }}>
          <div className="h-full rounded-full bg-red transition-[width] duration-700" style={{ width: `${Math.max(2, pct)}%` }} />
        </div>
        <p className="mt-2 text-[16px] font-semibold tabular-nums">
          ฿{baht(goal.raised)} <span className="font-normal opacity-60">/ ฿{baht(goal.target)}</span>
        </p>
      </div>
    </main>
  );
}
