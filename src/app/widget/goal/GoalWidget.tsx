"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { baht } from "@/lib/format";
import type { GoalStyle } from "@/lib/streamer-stats";

type Goal = { title: string; target: number; raised: number; style?: GoalStyle };

/**
 * หลอดเป้าหมายใน OBS อัปเดตเองทุก 10 วินาที
 * tube  = หลอดแก้วเก็บเงิน แนวตั้ง (ออกแบบที่ 360 × 640)
 * ring  = วงแหวนมุมจอ ป้ายเล็ก (ออกแบบที่ 300 × 90)
 * ทุกแบบ (ยกเว้นแบบเรียบ) ย่อ/ขยายให้พอดี Browser Source เองโดยคงสัดส่วน ตั้งกล่องใน OBS ขนาดไหนก็ไม่ยืดเบี้ยว
 * basic = การ์ดเรียบ (ค่าเริ่มต้น 600 × 160)
 * battery   = แบตเตอรี่ชาร์จ 10 ช่อง (560 × 150)
 * gauge     = มาตรวัดเข็ม ครึ่งวงกลม (380 × 250)
 * milestone = ด่านเป้าหมาย 4 เช็คพอยต์ (660 × 180)
 */
export function GoalWidget({ token, light, forced }: { token: string; light: boolean; forced: GoalStyle | null }) {
  const [goal, setGoal] = useState<Goal | null>(null);
  const [error, setError] = useState(false);
  // ยอดเพิ่ม → เล่นเอฟเฟกต์ของแต่ละแบบ (หยอดเหรียญ, +฿, กะพริบ)
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
  const style = forced ?? goal.style ?? "basic";
  if (style === "tube") return <Tube goal={goal} pct={pct} bump={bump} />;
  if (style === "ring") return <Ring goal={goal} pct={pct} bump={bump} />;
  if (style === "battery") return <Battery goal={goal} pct={pct} bump={bump} />;
  if (style === "gauge") return <Gauge goal={goal} pct={pct} bump={bump} />;
  if (style === "milestone") return <Milestone goal={goal} pct={pct} bump={bump} />;
  return <Basic goal={goal} pct={pct} light={light} />;
}

type View = { goal: Goal; pct: number; bump: number };

/** ยอดที่เพิ่งเข้ามา (+฿) โชว์ชั่วครู่หลังมีโดเนท แล้วหายไปเอง */
function usePlus(raised: number, bump: number) {
  const [plus, setPlus] = useState<number | null>(null);
  const prev = useRef(raised);
  useEffect(() => {
    if (!bump) return;
    setPlus(raised - prev.current);
    prev.current = raised;
    const t = setTimeout(() => setPlus(null), 1700);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bump]);
  return plus;
}

/** วงแหวนมุมจอ: ป้ายเม็ดยา วงแหวนเติมตาม % เด้ง +฿ เมื่อมีโดเนท */
function Ring({ goal, pct, bump }: View) {
  const done = pct >= 100;
  const plus = usePlus(goal.raised, bump);
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

/** แบตเตอรี่ชาร์จ: 10 ช่อง ช่องที่กำลังชาร์จกะพริบ ครบเป้าเป็นสีเขียว */
function Battery({ goal, pct, bump }: View) {
  const done = pct >= 100;
  const full = Math.floor(pct / 10);
  const color = done ? "#30d158" : pct < 20 ? "#ff9f0a" : "#ff3b30";
  return (
    <Fit w={560} h={150}>
      <div className="m-4 w-[528px] rounded-[18px] bg-[rgba(12,12,14,.88)] px-5 py-3.5 text-white shadow-[0_0_0_1px_rgba(255,255,255,.08),0_10px_30px_rgba(0,0,0,.5)]">
        <div className="flex items-baseline gap-3">
          <svg aria-hidden viewBox="0 0 24 24" className="size-5 shrink-0 self-center" style={{ fill: color }}>
            <path d="M13 2 4 14h6l-1 8 9-12h-6z" />
          </svg>
          <p className="min-w-0 truncate text-[18px] font-bold">{goal.title}</p>
          <p className="ml-auto shrink-0 text-[18px] font-bold tabular-nums" style={{ color }}>
            {done ? "ชาร์จเต็ม!" : `${Math.floor(pct)}%`}
          </p>
        </div>
        <div className="mt-2.5 flex items-center">
          <div key={bump} className={`flex h-[38px] flex-1 gap-[5px] rounded-[10px] p-[6px] shadow-[inset_0_0_0_3px_rgba(255,255,255,.35)] ${bump ? "goal-batt-bump" : ""}`}>
            {Array.from({ length: 10 }, (_, i) => {
              const on = done || i < full;
              const charging = !done && i === full;
              return (
                <span
                  key={i}
                  className={`flex-1 rounded-[4px] transition-colors duration-500 ${charging ? "goal-batt-blink" : ""}`}
                  style={{ background: on || charging ? color : "rgba(255,255,255,.08)", boxShadow: on ? `0 0 8px ${color}` : undefined }}
                />
              );
            })}
          </div>
          <span aria-hidden className="ml-1 h-4 w-2 rounded-r bg-white/35" />
        </div>
        <p className="mt-2 text-[15px] tabular-nums">
          <b>฿{baht(goal.raised)}</b>
          <span className="text-white/55"> / ฿{baht(goal.target)}</span>
        </p>
      </div>
    </Fit>
  );
}

/** มาตรวัดเข็ม: ครึ่งวงกลม เข็มหมุนตาม % สะบัดเล็กน้อยเมื่อมีโดเนท */
function Gauge({ goal, pct, bump }: View) {
  const done = pct >= 100;
  const deg = -90 + pct * 1.8;
  return (
    <Fit w={380} h={250}>
      <div className="m-3 flex h-[226px] w-[356px] flex-col items-center rounded-[22px] bg-[rgba(12,12,14,.88)] px-4 pt-3 text-white shadow-[0_0_0_1px_rgba(255,255,255,.08),0_10px_30px_rgba(0,0,0,.5)]">
        <p className="w-full shrink-0 truncate text-center text-[16px] font-bold">{goal.title}</p>
        <svg viewBox="0 0 200 112" className="mt-1 w-[236px] shrink-0 overflow-visible">
          <defs>
            <linearGradient id="gauge-g" x1="0" x2="1">
              <stop offset="0" stopColor="#7a0000" />
              <stop offset=".7" stopColor="#ff3b30" />
              <stop offset="1" stopColor="#ff8a80" />
            </linearGradient>
          </defs>
          <path d="M20 100 A80 80 0 0 1 180 100" fill="none" stroke="rgba(255,255,255,.1)" strokeWidth="14" strokeLinecap="round" />
          <path
            d="M20 100 A80 80 0 0 1 180 100"
            fill="none"
            stroke={done ? "#30d158" : "url(#gauge-g)"}
            strokeWidth="14"
            strokeLinecap="round"
            pathLength={100}
            strokeDasharray={`${Math.max(0.5, pct)} 100`}
            className="transition-[stroke-dasharray] duration-1000 ease-out"
            style={{ filter: "drop-shadow(0 0 6px rgba(255,59,48,.6))" }}
          />
          {Array.from({ length: 11 }, (_, i) => {
            const a = Math.PI - (i / 10) * Math.PI;
            const r1 = i % 5 === 0 ? 56 : 61;
            return (
              <line
                key={i}
                x1={100 + Math.cos(a) * r1}
                y1={100 - Math.sin(a) * r1}
                x2={100 + Math.cos(a) * 67}
                y2={100 - Math.sin(a) * 67}
                stroke="rgba(255,255,255,.4)"
                strokeWidth={i % 5 === 0 ? 2 : 1}
              />
            );
          })}
          <g style={{ transform: `rotate(${deg}deg)`, transformOrigin: "100px 100px", transition: "transform 1.2s cubic-bezier(.3,1.4,.5,1)" }}>
            <g key={bump} className={bump ? "goal-needle-kick" : ""} style={{ transformOrigin: "100px 100px" }}>
              <path d="M97 100 L100 36 L103 100 Z" fill="#fff" style={{ filter: "drop-shadow(0 0 4px rgba(255,255,255,.7))" }} />
            </g>
          </g>
          <circle cx="100" cy="100" r="8" fill="#1c1c1e" stroke="#fff" strokeWidth="2" />
        </svg>
        <p className="mt-1 text-[26px] font-bold leading-none tabular-nums">{done ? "ครบเป้า!" : `${Math.floor(pct)}%`}</p>
        <p className="mt-1.5 text-[14px] tabular-nums">
          <b>฿{baht(goal.raised)}</b>
          <span className="text-white/55"> / ฿{baht(goal.target)}</span>
        </p>
      </div>
    </Fit>
  );
}

/** ด่านเป้าหมาย: เส้นทางมีเช็คพอยต์ 25/50/75/100% ผ่านด่านไหนติ๊กถูก ด่านถัดไปเต้นเรียก */
function Milestone({ goal, pct, bump }: View) {
  const done = pct >= 100;
  const stops = [25, 50, 75, 100];
  const next = stops.find((s) => pct < s);
  return (
    <Fit w={660} h={180}>
      <div className="m-4 w-[628px] rounded-[20px] bg-[rgba(12,12,14,.88)] px-6 pb-3 pt-3 text-white shadow-[0_0_0_1px_rgba(255,255,255,.08),0_10px_30px_rgba(0,0,0,.5)]">
        <div className="flex items-baseline gap-3">
          <p className="min-w-0 truncate text-[18px] font-bold">{goal.title}</p>
          <p className="ml-auto shrink-0 text-[14px] tabular-nums text-white/60">
            {done ? "ผ่านครบทุกด่าน! 🏁" : `ด่านถัดไป ฿${baht(Math.round((goal.target * (next ?? 100)) / 100))}`}
          </p>
        </div>
        <div className="relative mx-4 mb-7 mt-10 h-2 rounded-full bg-white/10">
          <div
            key={bump}
            className={`absolute inset-y-0 left-0 rounded-full bg-[linear-gradient(90deg,#c40000,#ff3b30)] shadow-[0_0_10px_rgba(255,59,48,.7)] transition-[width] duration-1000 ease-out ${bump ? "goal-edge-flash" : ""}`}
            style={{ width: `${pct}%` }}
          />
          {/* ป้ายยอดปัจจุบันวิ่งตามปลายเส้น */}
          <div className="absolute -top-9 -translate-x-1/2 transition-[left] duration-1000 ease-out" style={{ left: `clamp(30px, ${pct}%, calc(100% - 30px))` }}>
            <span key={bump} className="goal-chip-in block whitespace-nowrap rounded-md bg-white px-2 py-0.5 text-[13px] font-bold tabular-nums text-[#1d1d1f]">
              ฿{baht(goal.raised)}
            </span>
          </div>
          {stops.map((s) => {
            const passed = pct >= s;
            return (
              <div key={s} className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2" style={{ left: `${s}%` }}>
                <span
                  className={`grid size-7 place-items-center rounded-full border-[3px] text-[13px] font-bold transition-colors duration-500 ${
                    passed
                      ? "border-[#ff3b30] bg-[#ff3b30] text-white shadow-[0_0_12px_rgba(255,59,48,.8)]"
                      : s === next
                        ? "goal-node-pulse border-[#ff3b30] bg-[#1c1c1e]"
                        : "border-white/20 bg-[#1c1c1e]"
                  }`}
                >
                  {passed ? "✓" : s === 100 ? <span className="text-[12px]">🏁</span> : null}
                </span>
                <span className={`absolute left-1/2 top-8 -translate-x-1/2 whitespace-nowrap text-[12px] tabular-nums ${passed ? "text-white" : "text-white/45"}`}>
                  ฿{baht(Math.round((goal.target * s) / 100))}
                </span>
              </div>
            );
          })}
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
