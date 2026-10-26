import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { NavBar } from "@/components/NavBar";
import { Footer } from "@/components/Footer";
import { PageBackdrop } from "@/components/PageBackdrop";

export const metadata: Metadata = { title: "วิธีใช้งาน" };

const faqs = [
  {
    q: "เพิ่มลิงก์ใน OBS แล้วจอว่าง",
    a: "ปกติครับ วิดเจ็ตโปร่งใสและจะแสดงเฉพาะตอนมีโดเนท กดทดสอบแจ้งเตือนในแดชบอร์ดเพื่อเช็ค ถ้ายังไม่ขึ้น คลิกขวาที่ source เลือก Properties แล้วกด Refresh cache of current page",
  },
  {
    q: "โอนแล้วแต่แนบสลิปไม่ผ่าน",
    a: "เช็คว่าสลิปเห็น QR มุมล่างชัด ยอดตรงกับที่กรอก และโอนเข้าพร้อมเพย์ของสตรีมเมอร์คนนี้ สลิปหนึ่งใบใช้ได้ครั้งเดียว",
  },
  {
    q: "QR หมดอายุก่อนโอน",
    a: "QR ใช้ได้ 15 นาที กดสร้าง QR ใหม่ได้เลย ถ้าโอนไปแล้วไม่ต้องโอนซ้ำ ให้แนบสลิปเดิมกับ QR ใหม่ที่ยอดเท่ากัน",
  },
  {
    q: "ไม่ได้ยินเสียงโดเนทใน Audio Mixer",
    a: "ใน Properties ของ Browser Source ติ๊ก Control audio via OBS แล้วเสียงโดเนทจะแยกเป็นช่องของตัวเองใน Mixer ปรับเสียงหรือส่งออกไลฟ์ได้",
  },
  {
    q: "เงินเข้าบัญชีไหน",
    a: "เข้าบัญชีพร้อมเพย์ของสตรีมเมอร์โดยตรง เว็บนี้ไม่ได้ถือเงินแทน ไม่มีรอบถอนเงิน",
  },
];

type Step = { title: string; body: ReactNode; visual: ReactNode; tip?: ReactNode; extra?: ReactNode };

const b = (t: string) => <b className="font-semibold text-ink">{t}</b>;

const viewerSteps: Step[] = [
  {
    title: "เลือกยอดและเขียนข้อความ",
    body: <>เปิดลิงก์โดเนทของสตรีมเมอร์ เลือกยอดเงินหรือพิมพ์เอง ใส่ชื่อ (ไม่ใส่ก็ได้) และข้อความที่อยากให้ขึ้นจอ แล้วกด {b("สร้าง QR พร้อมเพย์")}</>,
    visual: <Phone src="/howto/viewer-1-form-v2.webp" alt="หน้าโดเนท เลือกยอด ฿100 ใส่ชื่อและข้อความ" />,
    tip: "สแกน QR จากจอไลฟ์ หรือกดลิงก์ในคำอธิบายช่อง ก็มาที่หน้านี้",
  },
  {
    title: "สแกน QR พร้อมเพย์",
    body: "ใช้แอปธนาคารไหนก็ได้สแกน QR ยอดเงินกรอกไว้ให้แล้ว เช็กชื่อบัญชีผู้รับให้ตรงกับสตรีมเมอร์ แล้วโอนได้เลย เงินเข้าบัญชีสตรีมเมอร์โดยตรง",
    visual: <Phone src="/howto/viewer-2-qr-v2.webp" alt="หน้า QR พร้อมเพย์พร้อมยอดเงินและชื่อบัญชีผู้รับ" />,
    tip: <>โดเนทจากมือถือเครื่องเดียว กด {b("บันทึกรูป QR")} แล้วเปิดในแอปธนาคารได้ · QR ใช้ได้ 15 นาที</>,
  },
  {
    title: "แนบสลิป",
    body: <>กลับมาที่หน้าเดิม กด {b("เลือกไฟล์")} เลือกรูปสลิปจากแอปธนาคาร แล้วกด {b("ส่งสลิป")} ระบบจะตรวจยอด บัญชีผู้รับ และสลิปซ้ำให้อัตโนมัติ</>,
    visual: <Phone src="/howto/viewer-3-slip-v4.webp" alt="ช่องแนบสลิปและปุ่มส่งสลิป" />,
    extra: (
      <div className="mt-5 flex items-center gap-4 rounded-2xl bg-fill p-3">
        <Image unoptimized src="/howto/viewer-3b-done-v2.webp" alt="หน้าขึ้นจอแล้ว หลังสลิปผ่าน" width={780} height={1688} className="w-20 shrink-0 rounded-xl" />
        <span className="text-[14px] text-ink-2">สลิปผ่านแล้วจะขึ้นว่า {b("“ขึ้นจอแล้ว”")} ทันที</span>
      </div>
    ),
  },
  {
    title: "ขึ้นจอไลฟ์",
    body: "แจ้งเตือนเด้งบนจอของสตรีมเมอร์ภายในไม่กี่วินาที พร้อมเสียงอ่านชื่อ ยอด และข้อความของคุณ",
    visual: <Screen src="/howto/viewer-4-alert-v2.webp" alt="แจ้งเตือนโดเนทของมีมี่ ฿100 ขึ้นบนจอไลฟ์" caption="จอไลฟ์ของสตรีมเมอร์" />,
  },
];

const obsSteps: Step[] = [
  {
    title: "คัดลอกลิงก์วิดเจ็ต",
    body: <>เข้าสู่ระบบแล้วไปที่ {b("แดชบอร์ด › OBS และลิงก์")} กด {b("คัดลอก")} ที่ช่องลิงก์วิดเจ็ต แล้วเลือกรูปแบบแจ้งเตือนที่ชอบได้เลย</>,
    visual: <Browser src="/howto/streamer-1-widget-v2.webp" alt="ช่องลิงก์วิดเจ็ตและตัวเลือกรูปแบบแจ้งเตือนในแดชบอร์ด" width={1100} height={813} />,
    tip: <>ลิงก์นี้เป็นของคุณคนเดียว อย่าแชร์ให้คนอื่น ถ้าหลุดกด {b("สร้างลิงก์วิดเจ็ตใหม่")}</>,
  },
  {
    title: "เพิ่ม Browser Source ใน OBS",
    body: <>ในช่อง Sources กด {b("+")} เลือก {b("Browser")} วางลิงก์ในช่อง URL ตั้งขนาด {b("1920 × 1080")} และอย่าติ๊ก Local file ใช้ได้ทั้ง OBS, Streamlabs และ TikTok Live Studio</>,
    visual: <ObsIllustration />,
    tip: <>ติ๊ก {b("Control audio via OBS")} เพื่อแยกเสียงโดเนทเป็นช่องของตัวเองใน Audio Mixer</>,
  },
  {
    title: "กดทดสอบแจ้งเตือน",
    body: <>กลับมาที่แดชบอร์ด กด {b("ทดสอบแจ้งเตือน")} ถ้าแจ้งเตือนเด้งใน OBS พร้อมเสียง แปลว่าพร้อมไลฟ์แล้ว</>,
    visual: (
      <div className="grid w-full max-w-[620px] gap-4">
        <Browser src="/howto/streamer-3-test-v2.webp" alt="ปุ่มทดสอบแจ้งเตือนในแดชบอร์ด พร้อมข้อความส่งแล้ว" width={1100} height={128} />
        <Screen src="/howto/streamer-3-alert-v2.webp" alt="แจ้งเตือนทดสอบเด้งบนจอ OBS" caption="แจ้งเตือนทดสอบเด้งบนจอ OBS" />
      </div>
    ),
    tip: <>ป้ายข้างชื่อจะขึ้น <b className="font-semibold text-ok">วิดเจ็ตใน OBS ออนไลน์</b> เมื่อ OBS เปิดลิงก์อยู่</>,
  },
  {
    title: "ตั้งเป้าหมายโดเนท (ไม่บังคับ)",
    body: "ตั้งชื่อและยอดเป้าหมาย เลือกหน้าตาหลอด แล้วคัดลอกลิงก์หลอดเป้าหมายไปเพิ่มเป็น Browser Source อีกอัน ผู้ชมจะเห็นหลอดขยับทุกครั้งที่มีโดเนท",
    visual: <Browser src="/howto/streamer-4-goal-v3.webp" alt="การ์ดเป้าหมายโดเนทและตัวเลือกหน้าตาหลอด" width={963} height={1194} className="max-w-[420px]" />,
    tip: "แคปซูลนีออน 600 × 160 · หลอดแก้ว 360 × 640",
  },
];

/* ---------- กรอบรูป ---------- */

function Phone({ src, alt }: { src: string; alt: string }) {
  return (
    <div className="w-[260px] rounded-[44px] bg-[#1d1d1f] p-2.5 shadow-[0_0_0_1px_rgb(255_255_255/0.08),0_40px_80px_-30px_rgb(225_6_0/0.35)] sm:w-[280px]">
      <Image unoptimized src={src} alt={alt} width={780} height={1688} className="block w-full rounded-[34px]" />
    </div>
  );
}

function Browser({ src, alt, width, height, className = "" }: { src: string; alt: string; width: number; height: number; className?: string }) {
  return (
    <div className={`w-full max-w-[620px] overflow-hidden rounded-2xl bg-[#1c1c1e] shadow-[0_0_0_1px_rgb(255_255_255/0.08),0_40px_80px_-30px_rgb(225_6_0/0.35)] ${className}`}>
      <div aria-hidden className="flex items-center gap-1.5 bg-[#2c2c2e] px-3.5 py-2.5">
        <span className="size-2.5 rounded-full bg-[#ff5f57]" />
        <span className="size-2.5 rounded-full bg-[#febc2e]" />
        <span className="size-2.5 rounded-full bg-[#28c840]" />
        <span className="ml-2.5 flex-1 truncate rounded-md bg-[#1c1c1e] px-2.5 py-1 text-[12px] text-[#8e8e93]">doku · แดชบอร์ด</span>
      </div>
      <Image unoptimized src={src} alt={alt} width={width} height={height} className="block w-full" />
    </div>
  );
}

function Screen({ src, alt, caption }: { src: string; alt: string; caption: string }) {
  return (
    <figure className="w-full max-w-[620px]">
      <Image
        unoptimized
        src={src}
        alt={alt}
        width={1100}
        height={618}
        className="block w-full rounded-2xl shadow-[0_0_0_1px_rgb(255_255_255/0.08),0_40px_80px_-30px_rgb(225_6_0/0.45)]"
      />
      <figcaption className="mt-2 text-center text-[12px] text-ink-3">{caption}</figcaption>
    </figure>
  );
}

/** ภาพประกอบหน้าต่างเพิ่ม Browser Source (วาดเอง ไม่ใช่ภาพจริงจาก OBS) */
function ObsIllustration() {
  const field = "mt-1 rounded-md bg-[#121214] px-2.5 py-2 text-[#f5f5f7]";
  return (
    <figure className="w-full max-w-[620px]">
      <div className="overflow-hidden rounded-[14px] bg-[#1f1f23] text-[13px] text-[#8e8e93] shadow-[0_0_0_1px_rgb(255_255_255/0.08),0_40px_80px_-30px_rgb(225_6_0/0.35)]">
        <div className="bg-[#2a2a30] px-3.5 py-2 font-semibold text-[#d1d1d6]">เพิ่ม Browser Source</div>
        <div className="grid grid-cols-[150px_1fr] sm:grid-cols-[190px_1fr]">
          <div className="border-r border-[#33333a] p-3">
            <p className="text-[11px] font-bold tracking-[0.06em]">SOURCES</p>
            <p className="mt-2 rounded-md bg-[#33333a] px-2 py-1.5 text-[#d1d1d6]">🎮 เกม</p>
            <p className="mt-1 rounded-md bg-[#e10600]/20 px-2 py-1.5 text-white shadow-[inset_0_0_0_1px_rgb(255_69_58/0.6)]">🌐 Doku แจ้งเตือน</p>
            <div className="mt-2.5 flex gap-1.5">
              <span className="grid size-[26px] place-items-center rounded-md bg-[#e10600] font-bold text-white shadow-[0_0_0_3px_rgb(255_214_10/0.6)]">+</span>
              <span className="grid size-[26px] place-items-center rounded-md bg-[#33333a]">−</span>
            </div>
          </div>
          <div className="grid gap-2.5 p-3.5 sm:p-4">
            <div>
              URL
              <div className={`${field} truncate shadow-[0_0_0_2px_rgb(255_214_10/0.6)]`}>https://…/widget/alert?token=••••</div>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                Width<div className={field}>1920</div>
              </div>
              <div>
                Height<div className={field}>1080</div>
              </div>
            </div>
            <p className="flex items-center gap-2">
              <span className="size-4 rounded shadow-[inset_0_0_0_1.5px_#48484a]" />
              Local file <b className="font-semibold text-[#ff6b5e]">· อย่าติ๊ก</b>
            </p>
            <p className="flex items-center gap-2 text-[#d1d1d6]">
              <span className="grid size-4 place-items-center rounded bg-[#0a84ff] text-[11px] text-white">✓</span>
              Control audio via OBS
            </p>
            <span className="justify-self-end rounded-md bg-[#0a84ff] px-4 py-1.5 font-semibold text-white">OK</span>
          </div>
        </div>
      </div>
      <figcaption className="mt-2 text-center text-[12px] text-ink-3">ภาพประกอบ · หน้าตาจริงขึ้นกับโปรแกรมและเวอร์ชันที่ใช้</figcaption>
    </figure>
  );
}

/* ---------- ขั้นตอน ---------- */

function Steps({ items }: { items: Step[] }) {
  return (
    <ol className="mt-6">
      {items.map((s, i) => (
        <li
          key={s.title}
          className={`flex flex-col items-center gap-8 border-t border-line/60 py-12 lg:gap-16 lg:py-14 ${i % 2 ? "lg:flex-row-reverse" : "lg:flex-row"}`}
        >
          <div className="w-full min-w-0 lg:max-w-[420px] lg:flex-1">
            <span className="grid size-11 place-items-center rounded-full bg-red text-[20px] font-bold text-white shadow-[0_0_24px_rgb(225_6_0/0.5)]">
              {i + 1}
            </span>
            <h3 className="mt-4 text-[26px] font-semibold leading-tight tracking-tight sm:text-[30px]">{s.title}</h3>
            <p className="mt-3 text-[17px] leading-relaxed text-ink-2">{s.body}</p>
            {s.tip && (
              <p className="mt-4 flex gap-2.5 rounded-2xl bg-fill px-3.5 py-3 text-[14px] text-ink-2">
                <span aria-hidden>💡</span>
                <span>{s.tip}</span>
              </p>
            )}
            {s.extra}
          </div>
          <div className="flex w-full justify-center lg:w-auto lg:min-w-[620px]">{s.visual}</div>
        </li>
      ))}
    </ol>
  );
}

export default function HowToPage() {
  const jump = "rounded-full px-4 py-2.5 text-[15px] font-semibold text-ink-2 hover:bg-fill hover:text-ink";
  return (
    <>
      <NavBar />
      <main className="relative isolate overflow-hidden">
        <PageBackdrop />
        <div className="mx-auto max-w-[1120px] px-4 pb-24 pt-14 sm:pt-16">
          <h1 className="display text-[clamp(40px,6vw,64px)]">วิธีใช้งาน</h1>
          <p className="mt-3 max-w-[46ch] text-[clamp(17px,2vw,20px)] text-ink-2">
            ทุกขั้นตอนพร้อมภาพจากหน้าจอจริง ตั้งแต่ผู้ชมกดโดเนทจนแจ้งเตือนขึ้นจอไลฟ์
          </p>
          <nav aria-label="ไปที่หัวข้อ" className="mt-7 inline-flex max-w-full flex-wrap gap-1 rounded-[22px] bg-fill p-1">
            <a href="#viewer" className={jump}>
              สำหรับผู้ชม
            </a>
            <a href="#streamer" className={jump}>
              สำหรับสตรีมเมอร์
            </a>
            <a href="#faq" className={jump}>
              คำถามที่พบบ่อย
            </a>
          </nav>

          <section id="viewer" aria-labelledby="h-viewer" className="mt-14 scroll-mt-20">
            <h2 id="h-viewer" className="display text-[clamp(28px,4vw,40px)]">
              สำหรับผู้ชม
            </h2>
            <p className="mt-1.5 text-ink-3">โดเนทเสร็จในไม่ถึง 1 นาที ไม่ต้องสมัครสมาชิก</p>
            <Steps items={viewerSteps} />
            <Link href="/streamers" className="btn-quiet -ml-5">
              ดูรายชื่อสตรีมเมอร์
            </Link>
          </section>

          <section id="streamer" aria-labelledby="h-streamer" className="mt-16 scroll-mt-20">
            <h2 id="h-streamer" className="display text-[clamp(28px,4vw,40px)]">
              สำหรับสตรีมเมอร์: ตั้งค่า OBS
            </h2>
            <p className="mt-1.5 text-ink-3">ตั้งครั้งเดียว ใช้ได้ทุกไลฟ์</p>
            <Steps items={obsSteps} />
            <Link href="/dashboard" className="btn-quiet -ml-5">
              ไปที่แดชบอร์ด
            </Link>
          </section>

          <section id="faq" aria-labelledby="h-faq" className="mx-auto mt-20 max-w-[760px] scroll-mt-20">
            <h2 id="h-faq" className="display text-[clamp(28px,4vw,40px)]">
              คำถามที่พบบ่อย
            </h2>
            <div className="group-inset mt-8">
              {faqs.map((f) => (
                <details key={f.q} className="group/faq px-5">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 text-[17px] font-medium [&::-webkit-details-marker]:hidden">
                    {f.q}
                    <span
                      aria-hidden
                      className="text-[22px] leading-none text-ink-3 transition-transform duration-300 group-open/faq:rotate-45"
                    >
                      +
                    </span>
                  </summary>
                  <p className="pb-5 text-[15px] text-ink-2">{f.a}</p>
                </details>
              ))}
            </div>
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
}
