import { PARTNERS, type Partner } from "@/lib/partners";

/** แถบโลโก้เลื่อนวน (CSS ล้วน) · ชี้แล้วหยุด · ลดการเคลื่อนไหว = แถวนิ่งเลื่อนด้วยมือได้ */
export function PartnerStrip() {
  if (PARTNERS.length === 0) return null;
  // ซ้ำรายการให้ยาวพอเต็มจอ แล้วต่อสองชุดเพื่อวนแบบไม่มีรอยต่อ
  const set = Array.from({ length: Math.max(1, Math.ceil(8 / PARTNERS.length)) }, () => PARTNERS).flat();
  return (
    <section aria-label="พาร์ทเนอร์" className="partner-strip mx-auto max-w-[1160px] px-4 pt-10 sm:pt-14">
      <div className="partner-mask overflow-hidden">
        <ul className="partner-track flex w-max">
          {set.map((p, i) => (
            <Item key={`a${i}`} p={p} />
          ))}
          {set.map((p, i) => (
            <Item key={`b${i}`} p={p} hidden />
          ))}
        </ul>
      </div>
    </section>
  );
}

function Item({ p, hidden = false }: { p: Partner; hidden?: boolean }) {
  const body = p.logo ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={p.logo} alt={p.name} className="h-8 w-auto sm:h-9" loading="lazy" />
  ) : (
    <span className="whitespace-nowrap text-[18px] font-bold tracking-tight sm:text-[20px]">{p.name}</span>
  );
  return (
    <li aria-hidden={hidden || undefined} className="partner-item flex h-16 shrink-0 items-center px-7 sm:px-9">
      {p.url ? (
        <a href={p.url} target="_blank" rel="sponsored noopener noreferrer" tabIndex={hidden ? -1 : undefined} className="flex items-center">
          {body}
        </a>
      ) : (
        body
      )}
    </li>
  );
}
