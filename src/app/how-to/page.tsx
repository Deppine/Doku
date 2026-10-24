import type { Metadata } from "next";
import Link from "next/link";
import { NavBar } from "@/components/NavBar";
import { Footer } from "@/components/Footer";

export const metadata: Metadata = { title: "วิธีใช้งาน" };

const viewerSteps = [
  { title: "เลือกยอดและเขียนข้อความ", body: "เปิดหน้าโดเนทของสตรีมเมอร์ เลือกยอดเงิน ใส่ชื่อและข้อความที่อยากให้ขึ้นจอ" },
  { title: "สแกน QR พร้อมเพย์", body: "ใช้แอปธนาคารไหนก็ได้สแกน QR ยอดเงินกรอกไว้ให้แล้ว เงินเข้าบัญชีสตรีมเมอร์โดยตรง" },
  { title: "แนบสลิป", body: "บันทึกสลิปจากแอปธนาคาร แล้วแนบในหน้าเว็บ ระบบตรวจยอดและผู้รับ แล้วขึ้นจอให้อัตโนมัติ" },
];

const obsSteps = [
  { title: "คัดลอกลิงก์วิดเจ็ต", body: "เข้าแดชบอร์ด แล้วกดคัดลอกลิงก์วิดเจ็ต ลิงก์นี้เป็นของคุณคนเดียว อย่าแชร์ให้คนอื่น" },
  { title: "เพิ่ม Browser Source ใน OBS", body: "ในช่อง Sources กด + แล้วเลือก Browser อย่าติ๊ก Local file วางลิงก์ในช่อง URL ตั้งขนาด 1920 × 1080" },
  { title: "กดทดสอบแจ้งเตือน", body: "กลับมาที่แดชบอร์ดแล้วกดทดสอบแจ้งเตือน ถ้าแจ้งเตือนเด้งใน OBS แปลว่าพร้อมไลฟ์แล้ว" },
];

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
    q: "เงินเข้าบัญชีไหน",
    a: "เข้าบัญชีพร้อมเพย์ของสตรีมเมอร์โดยตรง เว็บนี้ไม่ได้ถือเงินแทน ไม่มีรอบถอนเงิน",
  },
];

function Steps({ items }: { items: { title: string; body: string }[] }) {
  return (
    <ol className="mt-8 grid gap-8 sm:grid-cols-3">
      {items.map((s, i) => (
        <li key={s.title} className="border-t-2 border-red pt-5">
          <span className="amount text-[36px] text-red">{i + 1}</span>
          <h3 className="mt-2 text-[19px] font-semibold tracking-tight">{s.title}</h3>
          <p className="mt-2 text-[15px] text-ink-2">{s.body}</p>
        </li>
      ))}
    </ol>
  );
}

export default function HowToPage() {
  return (
    <>
      <NavBar />
      <main>
        <div className="mx-auto max-w-[980px] px-4 pb-8 pt-14">
          <h1 className="display text-[clamp(40px,6vw,64px)]">วิธีใช้งาน</h1>
        </div>

        <section className="mx-auto max-w-[980px] px-4 py-10">
          <h2 className="display text-[clamp(28px,4vw,40px)]">สำหรับผู้ชม</h2>
          <Steps items={viewerSteps} />
          <Link href="/streamers" className="btn-quiet -ml-5 mt-6">
            ดูรายชื่อสตรีมเมอร์
          </Link>
        </section>

        <section className="mx-auto max-w-[980px] px-4 py-10">
          <h2 className="display text-[clamp(28px,4vw,40px)]">สำหรับสตรีมเมอร์: ตั้งค่า OBS</h2>
          <Steps items={obsSteps} />
          <Link href="/dashboard" className="btn-quiet -ml-5 mt-6">
            ไปที่แดชบอร์ด
          </Link>
        </section>

        <section className="mt-10 bg-paper">
          <div className="mx-auto max-w-[760px] px-4 py-20">
            <h2 className="display text-[clamp(28px,4vw,40px)]">คำถามที่พบบ่อย</h2>
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
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
