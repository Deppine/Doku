"use client";

import { useEffect, useState } from "react";
import { baht } from "@/lib/format";
import type { AlertData } from "./AlertCard";
import { Mascot } from "./Mascot";

const samples: AlertData[] = [
  { donorName: "โทนี่", message: "ติดตามมานานแล้วครับ ไลฟ์ต่อไปเรื่อย ๆ นะครับผม", amount: 500 },
  { donorName: "น้องมิ้นท์", message: "ซื้อน้ำเย็น ๆ กินระหว่างไลฟ์นะคะ", amount: 50 },
  { donorName: "ต้นกล้า", message: "เปิดเพลงที่ขอหน่อยครับ", amount: 100 },
  { donorName: "ไม่ระบุชื่อ", message: "สู้ ๆ นะ วันนี้เล่นดีมาก", amount: 300 },
];

/** ตัวอย่างแจ้งเตือนบนหน้าแรก: แบบ "โดกูชูป้าย" ขนาดตามกล่องที่ครอบ (ต้องมี @container) */
export function AlertDemo() {
  const [i, setI] = useState(0);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    const out = setTimeout(() => setLeaving(true), 4200);
    const next = setTimeout(() => {
      setLeaving(false);
      setI((v) => (v + 1) % samples.length);
    }, 4700);
    return () => {
      clearTimeout(out);
      clearTimeout(next);
    };
  }, [i]);

  const d = samples[i];
  return (
    <div aria-live="polite" className="absolute inset-0">
      <div key={i} className={`absolute bottom-0 left-[5cqw] flex items-end ${leaving ? "sign-out" : ""}`}>
        <div className="sign-peek">
          <div className="sign-bob">
            <Mascot className="block w-[15cqw]" eyes="happy" wave />
          </div>
        </div>
        <div className="sign-card mb-[9cqw] ml-[-1.8cqw] max-w-[42cqw] rounded-[1.8cqw] bg-white px-[2.2cqw] py-[1.5cqw] text-left text-[#1d1d1f] shadow-[0_1.2cqw_3cqw_-0.9cqw_rgba(0,0,0,.6),inset_0_-0.45cqw_0_#e5e5ea]">
          <p className="text-[1.5cqw] font-bold text-[#e10600]">โดกู ขอบคุณ!</p>
          <p className="text-[3cqw] font-bold leading-tight">
            {d.donorName} <span className="amount text-[#e10600]">฿{baht(d.amount)}</span>
          </p>
          <p className="mt-[0.4cqw] line-clamp-2 text-[1.9cqw] leading-snug text-[#3a3a3c]">{d.message}</p>
        </div>
      </div>
    </div>
  );
}
