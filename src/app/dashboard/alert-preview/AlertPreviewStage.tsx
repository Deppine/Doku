"use client";

import { AlertClassic, type AlertImage } from "@/components/AlertClassic";
import { AlertAnnounce, AlertSign } from "@/components/AlertStyles";
import type { AlertStyle } from "@/lib/alert-style";

const SAMPLE = { donorName: "โทนี่", amount: 500, message: "ติดตามมานานแล้วครับ ไลฟ์ต่อไปเรื่อย ๆ นะ" };

/** ฉากจอไลฟ์จำลอง + แจ้งเตือน 1 รายการ (แบบที่ยังให้เลือกใส่รูปได้) */
export function AlertPreviewStage({ style, image }: { style: AlertStyle; image: AlertImage | null }) {
  return (
    <main className="relative min-h-dvh overflow-hidden bg-[radial-gradient(70%_60%_at_15%_100%,#3a1d2a_0%,transparent_60%),radial-gradient(60%_60%_at_95%_0%,#1d2a44_0%,transparent_60%),linear-gradient(180deg,#141821,#0b0d12)]">
      {style === "sign" ? (
        <AlertSign data={SAMPLE} leaving={false} image={image} />
      ) : style === "announce" ? (
        <AlertAnnounce data={SAMPLE} leaving={false} image={image} />
      ) : (
        <div className="flex min-h-dvh items-start justify-center pt-[6vh]">
          <AlertClassic data={SAMPLE} image={style === "classic" ? image : null} className="pop-in" />
        </div>
      )}
    </main>
  );
}
