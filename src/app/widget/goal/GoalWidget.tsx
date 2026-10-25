"use client";

import { useEffect, useState } from "react";
import { baht } from "@/lib/format";

type Goal = { title: string; target: number; raised: number };

/** แถบความคืบหน้าเป้าหมาย อัปเดตเองทุก 10 วินาที */
export function GoalWidget({ token, light }: { token: string; light: boolean }) {
  const [goal, setGoal] = useState<Goal | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let stop = false;
    const load = async () => {
      const res = await fetch(`/api/widget/goal?token=${encodeURIComponent(token)}`, { cache: "no-store" }).catch(() => null);
      if (stop) return;
      if (!res?.ok) return setError(true);
      setError(false);
      setGoal((await res.json()).goal);
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
