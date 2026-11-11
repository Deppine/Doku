import { AlertPreviewStage } from "./AlertPreviewStage";
import { isAlertStyle } from "@/lib/alert-style";
import { isStickerId, pickSticker } from "@/lib/stickers";
import { ALERT_IMAGE_ANIMS, ALERT_IMAGE_SIZES, type AlertImageAnim, type AlertImageSize } from "@/lib/alert-sound";

export const dynamic = "force-dynamic";
export const metadata = { title: "ตัวอย่างแจ้งเตือน", robots: { index: false } };

type Search = { style?: string; img?: string; sticker?: string; size?: string; anim?: string };

/**
 * ตัวอย่างแจ้งเตือนแบบเดียวกับวิดเจ็ตใน OBS (ขนาด 1920×1080) สำหรับฝังเป็น iframe ย่อส่วนในแดชบอร์ด
 * img ต้องเป็นลิงก์รูปของตัวเองในแดชบอร์ดเท่านั้น (/api/dashboard/alert-image)
 */
export default async function Page({ searchParams }: { searchParams: Promise<Search> }) {
  const q = await searchParams;
  const img = q.img?.startsWith("/api/dashboard/alert-image") ? q.img : null;
  const size = (ALERT_IMAGE_SIZES as readonly string[]).includes(q.size ?? "") ? (q.size as AlertImageSize) : "m";
  const anim = (ALERT_IMAGE_ANIMS as readonly string[]).includes(q.anim ?? "") ? (q.anim as AlertImageAnim) : "pop";
  // random: สุ่มใหม่ทุกครั้งที่โหลดตัวอย่าง (กดเล่นอีกครั้ง = ท่าใหม่)
  const sticker = q.sticker === "random" ? pickSticker("random", String(Math.random())) : isStickerId(q.sticker) ? q.sticker : null;
  return (
    <AlertPreviewStage
      style={isAlertStyle(q.style) ? q.style : "classic"}
      image={sticker || img ? { url: img, sticker, size, anim } : null}
    />
  );
}
