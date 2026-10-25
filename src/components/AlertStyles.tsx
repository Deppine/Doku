import type { CSSProperties } from "react";
import { baht } from "@/lib/format";
import type { AlertData } from "./AlertCard";

/**
 * แจ้งเตือนแบบใหม่ 3 แบบ สำหรับ widget OBS (ขนาดอิงความกว้างจอ: ออกแบบไว้ที่ 1920×1080)
 * สีตายตัว ไม่เปลี่ยนตามโหมดมืด เพราะเป็นภาพบนจอไลฟ์
 */
type Props = { data: AlertData; leaving: boolean };

/** อักษรแรกของชื่อ (ข้ามสระหน้า เ แ โ ใ ไ) */
function initial(name: string) {
  return name.replace(/^[เแโใไ]/, "").charAt(0) || "?";
}

const redText: CSSProperties = {
  backgroundImage: "linear-gradient(180deg,#ff8a80 0%,#ff3b30 50%,#c40000 100%)",
  WebkitBackgroundClip: "text",
  backgroundClip: "text",
  color: "transparent",
};

/** 2 · นีออนมุมจอ: สไลด์เข้ามุมล่างซ้าย มีแถบนับเวลา */
export function AlertNeon({ data, leaving, showMs }: Props & { showMs: number }) {
  return (
    <div
      className={`fixed bottom-[2.2vw] left-[2.2vw] w-[min(760px,38vw)] overflow-hidden rounded-[1.1vw] bg-[linear-gradient(135deg,rgba(18,18,22,.94),rgba(40,10,14,.94))] text-white ${leaving ? "neon-out" : "neon-in"}`}
    >
      <div className="flex gap-[0.9vw] px-[1vw] pb-[1vw] pt-[0.85vw]">
        <div
          aria-hidden
          className="grid size-[3.6vw] shrink-0 place-items-center rounded-full bg-[linear-gradient(140deg,#ff6b5e,#c40000)] text-[1.6vw] font-bold shadow-[0_0_0_0.2vw_rgba(255,59,48,.25)]"
        >
          {initial(data.donorName)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-[0.5vw]">
            <b className="truncate text-[1.45vw]">{data.donorName}</b>
            <span className="shrink-0 text-[0.95vw] text-white/60">โดเนท</span>
            <span className="amount ml-auto shrink-0 text-[2.3vw] font-bold leading-none" style={redText}>
              ฿{baht(data.amount)}
            </span>
          </div>
          {data.message && (
            <p className="mt-[0.25vw] line-clamp-3 text-[1.2vw] leading-snug text-white/90 [overflow-wrap:anywhere]">{data.message}</p>
          )}
        </div>
      </div>
      <div className="h-[0.2vw] bg-white/10">
        <div className="neon-bar h-full bg-[linear-gradient(90deg,#ff3b30,#ff8a80)]" style={{ animationDuration: `${showMs}ms` }} />
      </div>
    </div>
  );
}

const CONFETTI = ["#ff3b30", "#ffd60a", "#ffffff", "#ff8a80", "#30d158"];

/** 3 · ป้ายเด้งกลางจอ: ป้ายแดงเด้ง แสงหมุน กระดาษโปรย */
export function AlertPop({ data, leaving }: Props) {
  return (
    <div className="fixed inset-0 grid place-items-center">
      <div className={`relative flex flex-col items-center ${leaving ? "pop-out" : "popx-in"}`}>
        <div
          aria-hidden
          className="pop-rays absolute left-1/2 top-[3.5vw] size-[34vw] -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{
            background: "repeating-conic-gradient(rgba(255,90,79,.32) 0 8deg,transparent 8deg 22deg)",
            WebkitMaskImage: "radial-gradient(closest-side,#000 30%,transparent)",
            maskImage: "radial-gradient(closest-side,#000 30%,transparent)",
          }}
        />
        <div className="relative rounded-[2vw] bg-[linear-gradient(160deg,#ff5a4f,#e10600_55%,#8f0010)] px-[2.6vw] pb-[1.2vw] pt-[1.3vw] text-center text-white shadow-[0_1.4vw_3vw_-0.8vw_rgba(225,6,0,.7),inset_0_1px_0_rgba(255,255,255,.35)]">
          <div className="pop-amt amount text-[5.6vw] font-bold leading-none [text-shadow:0_0.25vw_0_rgba(0,0,0,.25)]">฿{baht(data.amount)}</div>
          <div className="mt-[0.5vw] max-w-[36vw] truncate text-[1.5vw] font-semibold">{data.donorName} โดเนท</div>
        </div>
        {data.message && (
          <div className="pop-bubble relative mt-[1vw] max-w-[40vw] rounded-[1.2vw] bg-white px-[1.4vw] py-[0.8vw] text-center text-[1.55vw] font-semibold leading-snug text-[#1d1d1f] shadow-[0_0.8vw_2vw_-0.6vw_rgba(0,0,0,.6)] [overflow-wrap:anywhere]">
            <span aria-hidden className="absolute left-1/2 top-[-0.45vw] size-[0.9vw] -translate-x-1/2 rotate-45 bg-white" />
            <span className="line-clamp-3">{data.message}</span>
          </div>
        )}
        {CONFETTI.concat(CONFETTI, CONFETTI.slice(0, 2)).map((c, i) => (
          <span
            key={i}
            aria-hidden
            className="confetti absolute top-[1vw] h-[0.85vw] w-[0.55vw] rounded-[2px]"
            style={
              {
                left: `${8 + ((i * 37) % 84)}%`,
                background: c,
                "--dx": `${(i % 2 ? 1 : -1) * (1.5 + ((i * 13) % 50) / 12)}vw`,
                animationDelay: `${0.35 + (i % 4) * 0.08}s`,
              } as CSSProperties
            }
          />
        ))}
      </div>
    </div>
  );
}

/** 4 · ป้ายไฟ LED: แถบเต็มความกว้างด้านบน ข้อความวิ่ง */
export function AlertLed({ data, leaving, showMs }: Props & { showMs: number }) {
  const msg = data.message || "ขอบคุณที่สนับสนุนครับ";
  return (
    <div
      className={`fixed inset-x-0 top-0 border-b-[0.15vw] border-[#e10600] bg-[#070708] text-white shadow-[0_0.4vw_2vw_rgba(225,6,0,.35)] ${leaving ? "led-out" : "led-in"}`}
    >
      <div
        aria-hidden
        className="absolute inset-0"
        style={{ backgroundImage: "radial-gradient(rgba(255,59,48,.22) 0.07vw,transparent 0.1vw)", backgroundSize: "0.36vw 0.36vw" }}
      />
      <div className="relative flex items-center gap-[1.1vw] px-[1.6vw] py-[0.9vw]">
        <span className="shrink-0 rounded-[0.35vw] bg-[#e10600] px-[0.6vw] py-[0.15vw] text-[0.95vw] font-bold tracking-[0.06em]">DONATE</span>
        <span className="led-glow max-w-[24vw] shrink-0 truncate text-[1.9vw] font-bold">{data.donorName}</span>
        <span className="led-glow led-amt amount shrink-0 text-[2.6vw] font-bold">฿{baht(data.amount)}</span>
        <div
          className="relative min-w-0 flex-1 overflow-hidden text-[1.5vw] text-[#ffd7d3]"
          style={{
            WebkitMaskImage: "linear-gradient(90deg,transparent,#000 6%,#000 94%,transparent)",
            maskImage: "linear-gradient(90deg,transparent,#000 6%,#000 94%,transparent)",
          }}
        >
          {/* วิ่งจบภายในเวลาที่แจ้งเตือนค้างบนจอ */}
          <span className="led-msg inline-block whitespace-nowrap" style={{ animationDuration: `${Math.max(5000, showMs - 800)}ms` }}>
            {msg}
          </span>
        </div>
      </div>
    </div>
  );
}
