import { useId } from "react";

/**
 * มาสคอตของ Doku: "โดกู" ลำโพงจิ๋วสีแดง เสาอากาศไฟ LED
 * eyes: open = ตาโต · happy = ตายิ้ม
 * mouth: smile = ยิ้ม · talk = อ้าปากขยับ (ใช้ตอนอ่านข้อความ)
 * wave: โบกมือขวา
 */
export function Mascot({
  className = "",
  eyes = "open",
  mouth = "smile",
  wave = false,
  title,
}: {
  className?: string;
  eyes?: "open" | "happy";
  mouth?: "smile" | "talk";
  wave?: boolean;
  title?: string;
}) {
  const id = useId().replace(/:/g, "");
  return (
    <svg
      className={`overflow-visible ${className}`}
      viewBox="0 0 120 130"
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      <defs>
        <linearGradient id={`dk-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ff5a4f" />
          <stop offset="1" stopColor="#d10000" />
        </linearGradient>
      </defs>
      <line x1="60" y1="22" x2="60" y2="8" stroke="#8a8a8e" strokeWidth="3" strokeLinecap="round" />
      <circle className="mascot-led" cx="60" cy="7" r="5.5" fill="#ff453a" />
      <path d="M12 80 Q10 100 22 100" stroke="#c40000" strokeWidth="9" fill="none" strokeLinecap="round" />
      {wave ? (
        <g className="mascot-wave" style={{ transformOrigin: "100px 78px" }}>
          <path d="M100 78 Q114 66 116 52" stroke="#c40000" strokeWidth="9" fill="none" strokeLinecap="round" />
          <circle cx="116" cy="50" r="6" fill="#ff3b30" />
        </g>
      ) : (
        <path d="M100 80 Q110 90 108 100" stroke="#c40000" strokeWidth="9" fill="none" strokeLinecap="round" />
      )}
      <rect x="18" y="22" width="84" height="88" rx="30" fill={`url(#dk-${id})`} />
      <rect x="26" y="30" width="68" height="62" rx="24" fill="#ff5a4f" opacity=".35" />
      {eyes === "happy" ? (
        <>
          <path d="M37 58 Q45 48 53 58" stroke="#1d1d1f" strokeWidth="4" fill="none" strokeLinecap="round" />
          <path d="M67 58 Q75 48 83 58" stroke="#1d1d1f" strokeWidth="4" fill="none" strokeLinecap="round" />
        </>
      ) : (
        <g className="mascot-blink" style={{ transformOrigin: "60px 56px" }}>
          <ellipse cx="45" cy="56" rx="8" ry="10" fill="#fff" />
          <ellipse cx="75" cy="56" rx="8" ry="10" fill="#fff" />
          <circle cx="47" cy="58" r="4.5" fill="#1d1d1f" />
          <circle cx="77" cy="58" r="4.5" fill="#1d1d1f" />
          <circle cx="48.5" cy="55.5" r="1.6" fill="#fff" />
          <circle cx="78.5" cy="55.5" r="1.6" fill="#fff" />
        </g>
      )}
      <ellipse cx="33" cy="70" rx="6" ry="4" fill="#ff9a9a" opacity=".8" />
      <ellipse cx="87" cy="70" rx="6" ry="4" fill="#ff9a9a" opacity=".8" />
      {mouth === "talk" ? (
        <g className="mascot-talk" style={{ transformOrigin: "60px 76px" }}>
          <ellipse cx="60" cy="76" rx="7" ry="6" fill="#5a0000" />
          <ellipse cx="60" cy="79" rx="4" ry="2.4" fill="#ff7a7a" />
        </g>
      ) : (
        <path d="M50 74 Q60 82 70 74" stroke="#5a0000" strokeWidth="3.5" fill="none" strokeLinecap="round" />
      )}
      <rect x="40" y="108" width="12" height="12" rx="5" fill="#9a0000" />
      <rect x="68" y="108" width="12" height="12" rx="5" fill="#9a0000" />
    </svg>
  );
}
