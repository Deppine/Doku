import { baht } from "@/lib/format";
import type { AlertData } from "./AlertCard";

/**
 * แจ้งเตือนแบบตัวอักษรกลางจอ (ไม่มีกรอบ)
 * ใช้ text-shadow หลายทิศทำขอบดำ แทน -webkit-text-stroke เพื่อให้ใช้ได้กับ OBS รุ่นเก่า
 */
const outline = [
  "3px 0 0 #000", "-3px 0 0 #000", "0 3px 0 #000", "0 -3px 0 #000",
  "2px 2px 0 #000", "-2px 2px 0 #000", "2px -2px 0 #000", "-2px -2px 0 #000",
  "0 6px 18px rgb(0 0 0 / 0.55)",
].join(",");

/**
 * fit="viewport" (ค่าเริ่มต้น): ขนาดตามหน้าจอ ใช้ใน widget OBS
 * fit="container": ขนาดตามกล่องที่ครอบ (ต้องมี @container) ใช้กับตัวอย่างบนหน้าเว็บ
 */
export function AlertClassic({
  data,
  className = "",
  fit = "viewport",
}: {
  data: AlertData;
  className?: string;
  fit?: "viewport" | "container";
}) {
  const c = fit === "container";
  return (
    <div
      className={`${c ? "w-[90cqw]" : "w-[min(1400px,94vw)]"} text-center font-bold text-white ${className}`}
      style={{ textShadow: outline }}
    >
      <p className={`${c ? "text-[clamp(16px,6cqw,80px)]" : "text-[clamp(28px,4.2vw,80px)]"} leading-[1.15] tracking-[-0.01em] [text-wrap:balance]`}>
        <span className="text-[#ff3b30]">{data.donorName}</span> โดเนทมา{" "}
        {/* ยอดเงินไล่สี: ใช้ drop-shadow แทน text-shadow เพราะ text-shadow ทับสีไล่ของ background-clip */}
        <span
          className="inline-block bg-[linear-gradient(180deg,#ff8a80_0%,#ff3b30_45%,#c40000_100%)] bg-clip-text text-transparent [text-shadow:none]"
          style={{ filter: "drop-shadow(3px 0 0 #000) drop-shadow(-3px 0 0 #000) drop-shadow(0 3px 0 #000) drop-shadow(0 -3px 0 #000)" }}
        >
          {baht(data.amount)}฿
        </span>
      </p>
      {data.message && (
        <p className={`mx-auto mt-[0.4em] max-w-[30ch] ${c ? "text-[clamp(12px,3.7cqw,50px)]" : "text-[clamp(20px,2.6vw,50px)]"} leading-[1.3] [overflow-wrap:anywhere] [text-wrap:balance]`}>
          {data.message}
        </p>
      )}
    </div>
  );
}
