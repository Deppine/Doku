"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Mascot } from "./Mascot";

const KEY = "doku:helper-hidden";

/** โดกูผู้ช่วยลอยมุมขวาล่าง (หน้าแรก) · กล่องคำพูดโผล่เป็นระยะ · กดปิดแล้วจำไว้ในเบราว์เซอร์นี้ */
export function MascotHelper() {
  const [hidden, setHidden] = useState(true);
  useEffect(() => {
    try {
      setHidden(localStorage.getItem(KEY) === "1");
    } catch {
      setHidden(false);
    }
  }, []);
  if (hidden) return null;
  return (
    <div className="fixed bottom-5 right-5 z-30 hidden items-end gap-2 sm:flex">
      <div className="helper-bubble relative mb-14 rounded-[16px_16px_4px_16px] bg-white py-2.5 pl-3.5 pr-8 text-[14px] font-semibold text-[#1d1d1f] shadow-[0_10px_24px_-8px_rgba(0,0,0,.6)]">
        มีอะไรให้โดกูช่วยไหม?{" "}
        <Link href="/how-to" className="text-[#e10600] hover:underline">
          วิธีใช้งาน ›
        </Link>
        <button
          type="button"
          aria-label="ปิดโดกูผู้ช่วย"
          onClick={() => {
            setHidden(true);
            try {
              localStorage.setItem(KEY, "1");
            } catch {}
          }}
          className="absolute right-1.5 top-1.5 grid size-6 place-items-center rounded-full text-[14px] text-[#8e8e93] hover:bg-black/5 hover:text-[#1d1d1f]"
        >
          ×
        </button>
      </div>
      <Link href="/how-to" aria-label="โดกู: ไปหน้าวิธีใช้งาน" className="helper-float block rounded-full bg-[radial-gradient(circle,rgb(255_59_48/0.35),transparent_70%)] p-1.5">
        <Mascot className="block w-[76px]" wave />
      </Link>
    </div>
  );
}
