"use client";

import { useState } from "react";
import { CopyField } from "./DashboardClient";

type Size = "s" | "m" | "l";
type Theme = "light" | "dark";

/** QR หน้าโดเนท: ดาวน์โหลดไปใช้ต่อ + ลิงก์การ์ด QR สำหรับขึ้นจอใน OBS */
export function QrSection({ username, pageUrl, cardUrl, compact = false }: { username: string; pageUrl: string; cardUrl: string; compact?: boolean }) {
  const box = compact ? "bg-paper" : "bg-surface";
  const [size, setSize] = useState<Size>("m");
  const [theme, setTheme] = useState<Theme>("light");
  const [shared, setShared] = useState<string | null>(null);

  const params = new URLSearchParams();
  if (size !== "m") params.set("size", size);
  if (theme === "dark") params.set("theme", "dark");
  const obsUrl = params.size ? `${cardUrl}?${params}` : cardUrl;
  const qr = `/api/qr/${username}`;

  async function share() {
    try {
      if (navigator.share) {
        await navigator.share({ title: "โดเนทให้ฉันได้ที่นี่", url: pageUrl });
        return;
      }
      await navigator.clipboard.writeText(pageUrl);
      setShared("คัดลอกลิงก์แล้ว");
      setTimeout(() => setShared(null), 1600);
    } catch {}
  }

  return (
    <div className={`mt-4 grid gap-4 ${compact ? "" : "sm:grid-cols-[220px_1fr]"}`}>
      <div className={`rounded-[24px] ${box} p-4`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`${qr}?size=600`} alt="QR หน้าโดเนท" width={188} height={188} className="mx-auto aspect-square w-full max-w-[200px] rounded-xl bg-white" />
        <p className="mt-2 truncate text-center text-[12px] text-ink-3">{pageUrl.replace(/^https?:\/\//, "")}</p>
      </div>

      <div className="min-w-0 space-y-3">
        <div className="flex flex-wrap gap-2">
          <a href={`${qr}?size=1200&download=1`} className="btn-primary px-4 py-2 text-[15px]">
            ดาวน์โหลด PNG
          </a>
          <a href={`${qr}?format=svg&download=1`} className="btn-quiet px-4 py-2 text-[15px]">
            SVG (สำหรับพิมพ์)
          </a>
          <button type="button" onClick={share} className="btn-quiet px-4 py-2 text-[15px]">
            {shared ?? "แชร์ลิงก์"}
          </button>
        </div>

        <div className={`rounded-[24px] ${box} p-4`}>
          <p className="font-semibold">การ์ด QR บนจอไลฟ์</p>
          <p className="mt-0.5 text-[13px] text-ink-2">ใน OBS เพิ่ม Browser Source ขนาด 600 × 600 แล้ววางลิงก์นี้ พื้นหลังโปร่งใส ลากไปไว้มุมจอได้</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Segment
              label="ขนาด"
              value={size}
              onChange={setSize}
              options={[
                { v: "s", label: "เล็ก" },
                { v: "m", label: "กลาง" },
                { v: "l", label: "ใหญ่" },
              ]}
            />
            <Segment
              label="สี"
              value={theme}
              onChange={setTheme}
              options={[
                { v: "light", label: "สว่าง" },
                { v: "dark", label: "มืด" },
              ]}
            />
          </div>
          <div className="mt-3 [&>div]:bg-paper">
            <CopyField label="ลิงก์การ์ด QR" value={obsUrl} />
          </div>
          <a href={obsUrl} target="_blank" rel="noreferrer" className="link mt-2 inline-block text-[13px]">
            เปิดดูตัวอย่าง
          </a>
        </div>
      </div>
    </div>
  );
}

function Segment<T extends string>({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: T;
  onChange: (v: T) => void;
  options: { v: T; label: string }[];
}) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex gap-1 rounded-full bg-fill p-1 text-[13px]">
      {options.map((o) => (
        <button
          key={o.v}
          type="button"
          role="radio"
          aria-checked={value === o.v}
          onClick={() => onChange(o.v)}
          className={`rounded-full px-3 py-1 font-medium transition-all ${
            value === o.v ? "bg-chip text-ink shadow-[0_2px_6px_rgb(0_0_0/0.12)]" : "text-ink-2 hover:text-ink"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
