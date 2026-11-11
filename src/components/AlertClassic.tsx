import { baht } from "@/lib/format";
import type { AlertImageAnim, AlertImageSize } from "@/lib/alert-sound";
import type { StickerId } from "@/lib/stickers";
import type { AlertData } from "./AlertCard";
import { DoguSticker } from "./DoguSticker";

/** รูปที่จะแสดง: สติกเกอร์โดกูจากคลัง (sticker) หรือรูปที่อัปโหลด (url) */
export type AlertImage = { url: string | null; sticker: StickerId | null; size: AlertImageSize; anim: AlertImageAnim };

/** รูปหรือสติกเกอร์ + ท่าเข้า · className กำหนดขนาด */
export function AlertMedia({
  image,
  className,
  shadow,
  by = "height",
}: {
  image: AlertImage;
  className: string;
  shadow: string;
  /** className กำหนดความสูง (height) หรือความกว้าง (width) */
  by?: "height" | "width";
}) {
  if (image.sticker) {
    return (
      <span className={`alert-img-${image.anim} block ${className}`} style={{ filter: `drop-shadow(${shadow})` }}>
        <DoguSticker id={image.sticker} className={by === "height" ? "mx-auto h-full w-auto max-w-none" : "h-auto w-full"} />
      </span>
    );
  }
  if (!image.url) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element -- GIF ต้องเล่นตามไฟล์จริง ไม่ผ่านตัวย่อรูป
    <img src={image.url} alt="" className={`alert-img-${image.anim} block object-contain ${className}`} style={{ filter: `drop-shadow(${shadow})` }} />
  );
}

// ความสูงรูปตามขนาดที่เลือก (viewport = จอ OBS, container = กล่องตัวอย่าง 16:9 → 1vh ≈ 0.5625cqw)
const IMG_H = {
  viewport: { s: "h-[18vh]", m: "h-[28vh]", l: "h-[40vh]" },
  container: { s: "h-[10cqw]", m: "h-[16cqw]", l: "h-[22cqw]" },
} as const;

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
  image,
}: {
  data: AlertData;
  className?: string;
  fit?: "viewport" | "container";
  /** รูป/GIF เหนือข้อความ (ตั้งในแดชบอร์ด) */
  image?: AlertImage | null;
}) {
  const c = fit === "container";
  return (
    <div
      className={`${c ? "w-[90cqw]" : "w-[min(1400px,94vw)]"} text-center font-bold text-white ${className}`}
      style={{ textShadow: outline }}
    >
      {image && (image.sticker || image.url) && (
        <AlertMedia image={image} className={`mx-auto mb-[0.3em] w-auto max-w-full ${IMG_H[fit][image.size]}`} shadow="0 8px 18px rgb(0 0 0 / 0.5)" />
      )}
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
