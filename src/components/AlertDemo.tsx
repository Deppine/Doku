"use client";

import { useEffect, useState } from "react";
import type { AlertData } from "./AlertCard";
import { AlertClassic } from "./AlertClassic";

const samples: AlertData[] = [
  { donorName: "โทนี่", message: "ติดตามมานานแล้วครับ ไลฟ์ต่อไปเรื่อย ๆ นะครับผม", amount: 500 },
  { donorName: "น้องมิ้นท์", message: "ซื้อน้ำเย็น ๆ กินระหว่างไลฟ์นะคะ", amount: 50 },
  { donorName: "ต้นกล้า", message: "เปิดเพลงที่ขอหน่อยครับ", amount: 100 },
  { donorName: "ไม่ระบุชื่อ", message: "สู้ ๆ นะ วันนี้เล่นดีมาก", amount: 300 },
];

export function AlertDemo() {
  const [i, setI] = useState(0);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    const out = setTimeout(() => setLeaving(true), 3700);
    const next = setTimeout(() => {
      setLeaving(false);
      setI((v) => (v + 1) % samples.length);
    }, 4000);
    return () => {
      clearTimeout(out);
      clearTimeout(next);
    };
  }, [i]);

  return (
    <div className="flex justify-center" aria-live="polite">
      <AlertClassic key={i} data={samples[i]} fit="container" className={leaving ? "pop-out" : "pop-in"} />
    </div>
  );
}
