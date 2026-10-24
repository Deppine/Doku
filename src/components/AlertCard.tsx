import { baht } from "@/lib/format";

export type AlertData = { donorName: string; message: string; amount: number };

/** การ์ดแจ้งเตือนที่ขึ้นจอไลฟ์ (สีตายตัว ไม่เปลี่ยนตามโหมดมืด เพราะเป็นภาพบนจอไลฟ์) — ใช้ทั้งใน widget จริงและตัวอย่างบนหน้าแรก */
export function AlertCard({ data, className = "" }: { data: AlertData; className?: string }) {
  return (
    <div
      className={`relative w-[min(560px,92vw)] text-left overflow-hidden rounded-[28px] bg-white/95 px-7 pb-6 pt-5 text-[#1d1d1f] shadow-[0_24px_60px_-12px_rgb(225_6_0/0.35),0_2px_6px_rgb(0_0_0/0.08)] ${className}`}
    >
      <span aria-hidden className="absolute inset-x-0 top-0 h-1.5 bg-[#e10600]" />
      <div className="flex items-baseline justify-between gap-4">
        <p className="min-w-0 truncate text-[22px] font-semibold tracking-tight">{data.donorName}</p>
        <p className="amount shrink-0 text-[44px] text-[#e10600]">฿{baht(data.amount)}</p>
      </div>
      {data.message && (
        <p className="mt-1 line-clamp-3 text-[19px] leading-snug text-[#6e6e73]">{data.message}</p>
      )}
    </div>
  );
}
