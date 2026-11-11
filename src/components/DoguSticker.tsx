import { STICKERS, type StickerId } from "@/lib/stickers";

/** สติกเกอร์โดกูขยับได้จากคลัง (SVG ของเราเอง ไม่ใช่ข้อมูลจากผู้ใช้) */
export function DoguSticker({ id, className = "" }: { id: StickerId; className?: string }) {
  return (
    <svg
      viewBox="-20 -24 160 170"
      aria-hidden
      className={`block overflow-hidden ${className}`}
      style={{ aspectRatio: "160 / 170" }}
      dangerouslySetInnerHTML={{ __html: STICKERS[id].svg }}
    />
  );
}
