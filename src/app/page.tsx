import Link from "next/link";
import { NavBar } from "@/components/NavBar";
import { Footer } from "@/components/Footer";
import { AlertDemo } from "@/components/AlertDemo";
import { Mascot } from "@/components/Mascot";
import { CosmosScene } from "@/components/CosmosScene";
import { MascotHelper } from "@/components/MascotHelper";
import { PartnerStrip } from "@/components/PartnerStrip";
import { getStreamers } from "@/lib/streamers";


const facts = [
  {
    title: "เงินเข้าบัญชีคุณทันที",
    body: "ผู้ชมสแกน QR พร้อมเพย์ที่มียอดเงินในตัว เงินโอนตรงเข้าบัญชีของคุณ ไม่ต้องรอรอบถอน",
    icon: "M3 7h18v10H3zM3 11h18",
  },
  {
    title: "ตรวจสลิปให้อัตโนมัติ",
    body: "ระบบเช็คยอด ผู้รับ และสลิปซ้ำให้ทุกรายการ ก่อนขึ้นจอ ไม่ต้องนั่งเปิดแอปธนาคารดูเอง",
    icon: "M5 12l4 4 10-10",
  },
  {
    title: "วางลง OBS ได้ในลิงก์เดียว",
    body: "คัดลอกลิงก์วิดเจ็ตไปใส่เป็น Browser Source แจ้งเตือนจะเด้งพร้อมเสียงและอ่านข้อความให้",
    icon: "M10 14a4 4 0 0 0 6 0l3-3a4 4 0 0 0-6-6l-1 1M14 10a4 4 0 0 0-6 0l-3 3a4 4 0 0 0 6 6l1-1",
  },
];

const stats = [
  { value: "0%", label: "ค่าธรรมเนียม", accent: false },
  { value: "วินาที", label: "ตรวจสลิปจนขึ้นจอ", accent: true },
  { value: "1", label: "ลิงก์วางลง OBS", accent: false },
];

const steps = [
  "ผู้ชมกรอกชื่อ ข้อความ และยอดเงินในหน้าโดเนทของคุณ",
  "สแกน QR พร้อมเพย์ด้วยแอปธนาคารไหนก็ได้ แล้วแนบสลิป",
  "ระบบตรวจสลิป แล้วแจ้งเตือนขึ้นจอไลฟ์ภายในไม่กี่วินาที",
];

export const dynamic = "force-dynamic";

export default async function Home() {
  const demo = (await getStreamers())[0];
  return (
    <>
      <NavBar />
      <main>
        {/* พื้นหลังหัวหน้า: ไฟแดงเรือง ๆ + จุดพิกเซลแบบจอ LED ค่อย ๆ จางออก (ลากยาวไปหลังจอไลฟ์) */}
        <div className="relative isolate overflow-hidden">
          <div aria-hidden className="hero-bg hero-bg--stage">
            <div className="hero-glow" />
            <div className="hero-pixels" />
          </div>
          <section className="mx-auto max-w-[1120px] px-4 pb-16 pt-20 text-center sm:pt-24">
            <h1 className="display mx-auto max-w-[18ch] text-[clamp(44px,7.5vw,80px)] [text-wrap:balance]">
              {/* แบ่งคำเอง กันเบราว์เซอร์ตัดคำไทยกลางคำ เช่น "พร้อม|เพย์" */}
              <span className="whitespace-nowrap">โดเนทขึ้นจอ</span> <span className="whitespace-nowrap">เงินเข้า</span>
              <wbr />
              <span className="whitespace-nowrap">พร้อมเพย์</span>
              <wbr />
              <span className="whitespace-nowrap">คุณโดยตรง</span>
            </h1>
            <p className="mx-auto mt-6 max-w-[52ch] text-[clamp(19px,2.2vw,23px)] leading-snug text-ink-2">
              หน้ารับเงินสำหรับสตรีมเมอร์ ไม่หักค่าธรรมเนียม ไม่ต้องรอถอนเงิน
            </p>
            <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
              <Link href={demo ? `/${demo.username}` : "/streamers"} className="btn-primary">
                ลองโดเนท
              </Link>
              <Link href="/dashboard" className="btn-quiet">
                ตั้งค่าวิดเจ็ต OBS
              </Link>
            </div>

            {/* จอไลฟ์จำลองขนาดใหญ่: ให้เห็นของจริงที่ผู้ชมจะได้เห็น (มืดเสมอ เหมือนฉากเกมใน OBS) */}
            <div className="relative mx-auto mt-20 max-w-[1040px] sm:mt-24">
            {/* โดกูแอบดูจากหลังขอบบนของจอ (ครึ่งล่างถูกตัดด้วย overflow-hidden ให้ดูเหมือนซ่อนอยู่หลังจอ) */}
            <div aria-hidden className="absolute bottom-full right-[7%] h-[clamp(52px,10.4vw,108px)] w-[clamp(70px,14vw,150px)] overflow-hidden">
              <div className="home-peek absolute inset-x-0 top-[6%]">
                <Mascot className="block w-full" wave />
              </div>
            </div>
            <div className="@container relative aspect-video overflow-hidden rounded-[20px] bg-[#15171c] shadow-[0_60px_140px_-40px_rgb(225_6_0/0.55),0_0_0_1px_rgb(255_255_255/0.07)] sm:rounded-[28px]">
              <CosmosScene />
              <span aria-hidden className="absolute left-3 top-3 rounded-md bg-[#e10600] px-2 py-0.5 text-[11px] font-bold text-white sm:left-5 sm:top-[18px] sm:text-[12px]">
                LIVE
              </span>
              <AlertDemo />
              <p className="absolute right-3 top-3 text-[12px] text-white/45 sm:right-5 sm:top-[18px]">ตัวอย่างแจ้งเตือนบนจอไลฟ์</p>
            </div>
            </div>
          </section>
        </div>

        <PartnerStrip />

        {/* แถบตัวเลข */}
        <section aria-label="จุดเด่นแบบตัวเลข" className="mx-auto max-w-[980px] px-4">
          <dl className="grid grid-cols-3 gap-4 border-y border-line/70 py-10 text-center sm:py-14">
            {stats.map((s) => (
              <div key={s.label} className="flex flex-col-reverse">
                <dt className="mt-2 text-[13px] text-ink-2 sm:text-[15px]">{s.label}</dt>
                <dd className={`amount text-[clamp(30px,5vw,52px)] font-bold leading-none ${s.accent ? "text-red" : ""}`}>{s.value}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="mx-auto grid max-w-[980px] gap-10 px-4 pb-10 pt-20 sm:grid-cols-3 sm:gap-10">
          {facts.map((f) => (
            <div key={f.title}>
              <span aria-hidden className="grid h-11 w-11 place-items-center rounded-xl bg-red/15 text-red">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d={f.icon} />
                </svg>
              </span>
              <h2 className="mt-4 text-[21px] font-semibold leading-tight tracking-tight">{f.title}</h2>
              <p className="mt-2 text-[16px] text-ink-2">{f.body}</p>
            </div>
          ))}
        </section>

        <section className="mx-auto max-w-[980px] px-4 pb-28 pt-16">
          <h2 className="display mx-auto max-w-[16ch] text-center text-[clamp(32px,5vw,48px)]">สามขั้นตอนจากผู้ชมถึงหน้าจอ</h2>
          <div className="relative mt-14 sm:mt-24">
            {/* เส้นเชื่อมระหว่างขั้นตอน (จอกว้างเท่านั้น) */}
            <div aria-hidden className="absolute left-[16.6%] right-[16.6%] top-5 hidden h-0.5 bg-gradient-to-r from-red to-red/20 sm:block" />
            {/* โดกูเดินตามเส้น หยุดที่ขั้นตอน 1 → 2 → 3 (จอกว้างเท่านั้น) */}
            <div aria-hidden className="home-walker absolute -top-[68px] left-[16.6%] hidden w-0 sm:block">
              <div className="home-walker-bob -translate-x-1/2">
                <Mascot className="block w-[60px]" />
              </div>
            </div>
            <ol className="relative grid gap-10 sm:grid-cols-3 sm:gap-6">
              {steps.map((s, i) => (
                <li key={s} className="flex items-start gap-4 sm:flex-col sm:items-center sm:text-center">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-red font-bold text-white ring-8 ring-page">{i + 1}</span>
                  <p className="pt-1.5 text-[18px] leading-snug sm:max-w-[24ch] sm:pt-0">{s}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>
      </main>
      <MascotHelper />
      <Footer />
    </>
  );
}
