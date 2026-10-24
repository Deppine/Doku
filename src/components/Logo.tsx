/** โลโก้ Doku: ตัว D กับจุดแจ้งเตือน (สีแดงเปลี่ยนตามโหมดสว่าง/มืด) */
export function LogoMark({ size = 24, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden className={className}>
      <rect width="100" height="100" rx="23" fill="var(--color-red)" />
      <path
        d="M32 26h18c15 0 26 10.5 26 24S65 74 50 74H32z"
        fill="none"
        stroke="#fff"
        strokeWidth="10"
        strokeLinejoin="round"
      />
      <circle cx="66" cy="31" r="9" fill="#fff" />
      <circle cx="66" cy="31" r="4" fill="var(--color-red)" />
    </svg>
  );
}
