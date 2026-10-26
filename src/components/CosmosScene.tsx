/**
 * ฉากจักรวาลในจอไลฟ์ตัวอย่าง (หน้าแรก): เนบิวลา + ดาว 3 ชั้นเลื่อนช้าเร็วต่างกัน + ดาวกะพริบ + ดาวตก (ไม่มีดาวเคราะห์)
 * วาดด้วย CSS ล้วน ไม่มีรูป · ตำแหน่งดาวสุ่มแบบคงที่ (seed) ให้ server/client ตรงกัน
 */
function rand(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

type Star = { x: number; y: number; size: number; o: number; tw: boolean; d: number };

function makeStars(seed: number, n: number, sizes: number[]): Star[] {
  const r = rand(seed);
  return Array.from({ length: n }, () => ({
    x: r() * 100,
    y: r() * 100,
    size: sizes[Math.floor(r() * sizes.length)],
    o: 0.35 + r() * 0.65,
    tw: r() < 0.3,
    d: r() * 4,
  }));
}

const LAYERS = [
  { stars: makeStars(11, 90, [1, 1, 1.5]), cls: "cosmos-far" },
  { stars: makeStars(29, 45, [1.5, 2, 2]), cls: "cosmos-mid" },
  { stars: makeStars(47, 16, [2.5, 3]), cls: "cosmos-near" },
];

/** ดาวหนึ่งชุด วาดซ้ำสองครั้งต่อกันในแถบกว้าง 200% เพื่อเลื่อนวนแบบไม่มีรอยต่อ */
function Layer({ stars, cls }: { stars: Star[]; cls: string }) {
  return (
    <div className={`absolute inset-y-0 left-0 w-[200%] ${cls}`}>
      {[0, 50].map((off) =>
        stars.map((s, i) => (
          <span
            key={`${off}-${i}`}
            className={`absolute rounded-full bg-white ${s.tw ? "cosmos-twinkle" : ""}`}
            style={{
              left: `${off + s.x / 2}%`,
              top: `${s.y}%`,
              width: s.size,
              height: s.size,
              opacity: s.o,
              animationDelay: s.tw ? `-${s.d.toFixed(2)}s` : undefined,
              boxShadow: s.size >= 2.5 ? "0 0 6px 1px rgb(255 255 255 / 0.6)" : undefined,
            }}
          />
        )),
      )}
    </div>
  );
}

export function CosmosScene() {
  return (
    <div aria-hidden className="absolute inset-0 overflow-hidden bg-[#04050b]">
      {/* เนบิวลา: แดงตามธีม + ม่วงน้ำเงิน หายใจช้า ๆ */}
      <div className="cosmos-nebula absolute -inset-[10%] bg-[radial-gradient(40%_45%_at_22%_70%,rgb(225_6_0/0.35),transparent_70%),radial-gradient(45%_50%_at_78%_30%,rgb(94_92_230/0.32),transparent_70%),radial-gradient(35%_40%_at_55%_55%,rgb(191_90_242/0.18),transparent_70%)]" />
      {/* ทางช้างเผือกบาง ๆ พาดเฉียง */}
      <div className="absolute -inset-x-[20%] top-[30%] h-[40%] -rotate-[14deg] bg-[radial-gradient(50%_50%_at_50%_50%,rgb(255_255_255/0.07),transparent_70%)] blur-xl" />
      {LAYERS.map((l) => (
        <Layer key={l.cls} {...l} />
      ))}
      {/* ดาวตก 2 ดวง สลับจังหวะ */}
      <span className="cosmos-shoot absolute left-[70%] top-[8%] h-px w-[14cqw] bg-[linear-gradient(90deg,transparent,#fff)]" />
      <span className="cosmos-shoot absolute left-[40%] top-[22%] h-px w-[10cqw] bg-[linear-gradient(90deg,transparent,#fff)] [animation-delay:4.5s]" />
    </div>
  );
}
